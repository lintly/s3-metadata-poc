# Glue Creation
Ask me about anything that you are not sure of.
Update the current terraform configuration in the "terraform" directory.

## Set up AWS Glue DB + Table
Create an AWS Glue database named "jeff-poc".
I want to create an AWS Glue table named "inventory_metadata" within the "jeff-poc" database.
This table will store metadata information about the S3 bucket's inventory_table_configuration on the "jeff-meta-poc" bucket.

## Set up AWS Glue Crawler
Set up an AWS Glue Crawler to crawl the "jeff-meta-poc" S3 bucket's inventory_table_configuration and populate the AWS Glue Table with the inventory_table_configuration.
Set up an IAM role for the crawler to access the "jeff-meta-poc" S3 bucket.
Set the frequency to run the crawler every hour.
Output the data from the crawler to the "inventory_metadata" table.
