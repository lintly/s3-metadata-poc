#!/usr/bin/env python3
"""
Lambda function to automatically refresh Glue table metadata locations
for S3 Tables inventory and journal tables.

This function:
1. Gets current metadata locations from S3 Tables
2. Compares with Glue table configurations
3. Updates Glue tables if metadata locations changed
"""

import boto3
import os
import json
from typing import Dict, Optional

# Environment variables
REGION = os.environ['REGION']
BUCKET_NAME = os.environ['BUCKET_NAME']
GLUE_DATABASE = os.environ['GLUE_DATABASE']
ACCOUNT_ID = os.environ['ACCOUNT_ID']

# AWS clients
s3tables = boto3.client('s3tables', region_name=REGION)
glue = boto3.client('glue', region_name=REGION)

TABLE_BUCKET_ARN = f"arn:aws:s3tables:{REGION}:{ACCOUNT_ID}:bucket/aws-s3"
NAMESPACE = f"b_{BUCKET_NAME}"


def get_s3_tables_metadata_location(table_name: str) -> Optional[Dict[str, str]]:
    """Get metadata location from S3 Tables API."""
    try:
        response = s3tables.get_table_metadata_location(
            tableBucketARN=TABLE_BUCKET_ARN,
            namespace=NAMESPACE,
            name=table_name
        )
        return {
            'metadata_location': response['metadataLocation'],
            'warehouse_location': response['warehouseLocation']
        }
    except Exception as e:
        print(f"Error getting S3 Tables metadata for {table_name}: {e}")
        return None


def get_glue_table_metadata_location(table_name: str) -> Optional[Dict[str, str]]:
    """Get metadata location from Glue table."""
    try:
        response = glue.get_table(
            DatabaseName=GLUE_DATABASE,
            Name=table_name
        )
        table = response['Table']
        return {
            'metadata_location': table['Parameters'].get('metadata_location'),
            'warehouse_location': table['StorageDescriptor']['Location']
        }
    except Exception as e:
        print(f"Error getting Glue table metadata for {table_name}: {e}")
        return None


def update_glue_table(table_name: str, new_metadata: str, new_warehouse: str) -> bool:
    """Update Glue table with new metadata location."""
    try:
        # Get current table definition
        response = glue.get_table(
            DatabaseName=GLUE_DATABASE,
            Name=table_name
        )

        table = response['Table']

        # Update metadata location and warehouse
        table['Parameters']['metadata_location'] = new_metadata
        table['StorageDescriptor']['Location'] = new_warehouse

        # Remove read-only fields
        for field in ['DatabaseName', 'CreateTime', 'UpdateTime', 'CreatedBy',
                      'IsRegisteredWithLakeFormation', 'CatalogId', 'VersionId']:
            table.pop(field, None)

        # Update the table
        glue.update_table(
            DatabaseName=GLUE_DATABASE,
            TableInput=table
        )

        print(f"✅ Updated Glue table '{table_name}' with new metadata location")
        return True

    except Exception as e:
        print(f"❌ Error updating Glue table {table_name}: {e}")
        return False


def check_and_refresh_table(table_name: str) -> Dict[str, any]:
    """Check if table needs refresh and update if necessary."""
    print(f"\nChecking table: {table_name}")

    # Get S3 Tables metadata
    s3_metadata = get_s3_tables_metadata_location(table_name)
    if not s3_metadata:
        return {
            'table': table_name,
            'status': 'error',
            'message': 'Failed to get S3 Tables metadata'
        }

    # Get Glue metadata
    glue_metadata = get_glue_table_metadata_location(table_name)
    if not glue_metadata:
        return {
            'table': table_name,
            'status': 'error',
            'message': 'Failed to get Glue table metadata'
        }

    # Compare metadata locations
    if s3_metadata['metadata_location'] == glue_metadata['metadata_location']:
        print(f"✅ Table '{table_name}' is in sync")
        return {
            'table': table_name,
            'status': 'in_sync',
            'message': 'Metadata locations match'
        }

    # Metadata out of sync - update needed
    print(f"⚠️  Table '{table_name}' is out of sync")
    print(f"   S3 Tables:  {s3_metadata['metadata_location'][:80]}...")
    print(f"   Glue Table: {glue_metadata['metadata_location'][:80]}...")

    # Update Glue table
    success = update_glue_table(
        table_name,
        s3_metadata['metadata_location'],
        s3_metadata['warehouse_location']
    )

    if success:
        return {
            'table': table_name,
            'status': 'refreshed',
            'message': 'Updated with new metadata location',
            'old_location': glue_metadata['metadata_location'],
            'new_location': s3_metadata['metadata_location']
        }
    else:
        return {
            'table': table_name,
            'status': 'error',
            'message': 'Failed to update Glue table'
        }


def handler(event, context):
    """Lambda handler function."""
    print("=" * 50)
    print("Glue Metadata Refresh Lambda")
    print("=" * 50)
    print(f"Region: {REGION}")
    print(f"Bucket: {BUCKET_NAME}")
    print(f"Database: {GLUE_DATABASE}")

    results = []

    # Check and refresh inventory table
    results.append(check_and_refresh_table('inventory'))

    # Check and refresh journal table
    results.append(check_and_refresh_table('journal'))

    # Summary
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)

    in_sync = sum(1 for r in results if r['status'] == 'in_sync')
    refreshed = sum(1 for r in results if r['status'] == 'refreshed')
    errors = sum(1 for r in results if r['status'] == 'error')

    print(f"✅ In Sync:   {in_sync}")
    print(f"🔄 Refreshed: {refreshed}")
    print(f"❌ Errors:    {errors}")

    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'Glue metadata refresh completed',
            'results': results,
            'summary': {
                'in_sync': in_sync,
                'refreshed': refreshed,
                'errors': errors
            }
        })
    }


if __name__ == '__main__':
    # For local testing
    handler({}, None)
