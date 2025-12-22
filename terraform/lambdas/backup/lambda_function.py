import os
import boto3
from datetime import datetime, timedelta
import psycopg2
from urllib.parse import urlparse
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')

def lambda_handler(event, context):
    """
    Lambda function to backup Supabase Postgres database to S3

    Note: Requires Supabase Session Pooler URL (port 6543) for IPv4 compatibility.
    Session mode supports all PostgreSQL commands needed for backups.
    """
    bucket = os.environ['BACKUP_BUCKET']
    db_url = os.environ['SUPABASE_DB_URL']

    timestamp = datetime.utcnow().strftime('%Y-%m-%d_%H-%M-%S')
    filename = f'backup_{timestamp}.sql'
    s3_key = f'backups/{filename}'
    tmp_path = f'/tmp/{filename}'

    logger.info(f"Starting database backup: {filename}")

    try:
        # Parse connection URL
        parsed = urlparse(db_url)

        # Connect to database with IPv4 preference
        import socket

        # Get IPv4 address
        try:
            addr_info = socket.getaddrinfo(parsed.hostname, None, socket.AF_INET)
            ipv4_addr = addr_info[0][4][0]
            logger.info(f"Resolved {parsed.hostname} to IPv4: {ipv4_addr}")
        except socket.gaierror:
            logger.warning("Failed to resolve IPv4, using hostname directly")
            ipv4_addr = parsed.hostname

        conn = psycopg2.connect(
            hostaddr=ipv4_addr if ipv4_addr != parsed.hostname else None,
            host=parsed.hostname,
            port=parsed.port or 6543,
            database=parsed.path.lstrip('/'),
            user=parsed.username,
            password=parsed.password
        )

        logger.info("Connected to database successfully")

        # Create SQL dump
        with open(tmp_path, 'w') as f:
            cursor = conn.cursor()

            # Get all table names in public schema
            cursor.execute("""
                SELECT tablename FROM pg_tables
                WHERE schemaname = 'public'
                ORDER BY tablename
            """)
            tables = cursor.fetchall()

            logger.info(f"Found {len(tables)} tables to backup")

            # Write header
            f.write("-- Pana Database Backup\n")
            f.write(f"-- Generated: {timestamp}\n")
            f.write("-- Source: Supabase Database\n\n")
            f.write("SET statement_timeout = 0;\n")
            f.write("SET lock_timeout = 0;\n")
            f.write("SET client_encoding = 'UTF8';\n\n")

            # Dump each table
            for (table,) in tables:
                logger.info(f"Backing up table: {table}")

                # Get CREATE TABLE statement
                cursor.execute(f"""
                    SELECT 'CREATE TABLE IF NOT EXISTS ' || '{table}' || ' (' ||
                    array_to_string(
                        array_agg(
                            column_name || ' ' || data_type ||
                            CASE WHEN character_maximum_length IS NOT NULL
                                THEN '(' || character_maximum_length || ')'
                                ELSE ''
                            END ||
                            CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END
                        ), ', '
                    ) || ');'
                    FROM information_schema.columns
                    WHERE table_name = '{table}' AND table_schema = 'public'
                """)
                create_stmt = cursor.fetchone()
                if create_stmt and create_stmt[0]:
                    f.write(f"\n-- Table: {table}\n")
                    f.write(create_stmt[0] + "\n\n")

                # Get data
                cursor.execute(f'SELECT * FROM "{table}"')
                rows = cursor.fetchall()

                if rows:
                    # Get column names
                    cursor.execute(f"""
                        SELECT column_name FROM information_schema.columns
                        WHERE table_name = '{table}' AND table_schema = 'public'
                        ORDER BY ordinal_position
                    """)
                    columns = [col[0] for col in cursor.fetchall()]

                    f.write(f"-- Data for table: {table}\n")
                    for row in rows:
                        values = []
                        for val in row:
                            if val is None:
                                values.append('NULL')
                            elif isinstance(val, str):
                                # Escape single quotes
                                escaped = val.replace("'", "''")
                                values.append(f"'{escaped}'")
                            elif isinstance(val, (datetime, )):
                                values.append(f"'{val}'")
                            else:
                                values.append(str(val))

                        cols_str = ', '.join(f'"{col}"' for col in columns)
                        vals_str = ', '.join(values)
                        f.write(f'INSERT INTO "{table}" ({cols_str}) VALUES ({vals_str});\n')

                    f.write("\n")

            cursor.close()

        conn.close()
        logger.info("Database dump completed successfully")

        # Upload to S3
        with open(tmp_path, 'rb') as f:
            s3.put_object(
                Bucket=bucket,
                Key=s3_key,
                Body=f,
                ServerSideEncryption='AES256'
            )

        logger.info(f"Backup uploaded to s3://{bucket}/{s3_key}")

        # Cleanup old backups (handled by S3 lifecycle policy, but we can also do it here)
        cleanup_old_backups(bucket)

        # Cleanup temp file
        os.remove(tmp_path)

        return {
            'statusCode': 200,
            'body': f'Backup successful: {s3_key}'
        }

    except Exception as e:
        logger.error(f"Backup failed: {str(e)}")
        raise Exception(f"Backup failed: {str(e)}")


def cleanup_old_backups(bucket):
    """Remove backups older than 30 days (in addition to S3 lifecycle policy)"""
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=30)

        response = s3.list_objects_v2(Bucket=bucket, Prefix='backups/backup_')

        if 'Contents' not in response:
            logger.info("No backups found to cleanup")
            return

        deleted_count = 0
        for obj in response['Contents']:
            if obj['LastModified'].replace(tzinfo=None) < cutoff_date:
                s3.delete_object(Bucket=bucket, Key=obj['Key'])
                deleted_count += 1
                logger.info(f"Deleted old backup: {obj['Key']}")

        logger.info(f"Cleanup complete. Deleted {deleted_count} old backup(s)")

    except Exception as e:
        logger.error(f"Cleanup failed: {str(e)}")
        # Don't fail the backup if cleanup fails
