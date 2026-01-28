# TODO: Implement S3 Metadata POC

tofu init -upgrade
tofu destroy -target=aws_glue_catalog_table.journal -auto-approve
tofu apply -auto-approve


1. Keep the metadata in place for S3
2. Save the metadata back to Dynamo and to OpenSearch
3. We use the OpenSearch to allow searching on images
4. Metadata won't be used at this point except for display only (if we can avoid calling Dynamo for the same data)
5. Need to be able to search?
6. Permissions model
7. Internal and external use cases

1. On user uploaded images/videos, how are you thinking authorization will work?
2. When a user uploads a file with metadata, will that metadata need to be searched on or display only?
3. Is there anything with uploading in Horizon that we need to consider that we are not already trying to consider (structure, CRUD, CRUD metadata)?
4.
