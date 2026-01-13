
# UI Prompt
Use React and TypeScript for the UI updates.
We will use AWS SDK for S3 operations.
Follow all standards for React and TypeScript.
Validate linting and formatting.

Use .env file for all environment variables.
Set the .env file with the following variables:
- VITE_AWS_ACCESS_KEY_ID=xxx
- VITE_AWS_SECRET_ACCESS_KEY=xxx
- VITE_S3_BUCKET_NAME=jeff-poc-meta
- VITE_AWS_REGION=us-west-2
- VITE_S3_BUCKET_REGION=us-west-2

## ImageList.tsx Component
Create a new component called `ImageList.tsx`.
Display the data in a DataTable with the following columns:
- Thumbnail
- Description
- Version of the image/video
- Delete Button

Fetch the data from S3 bucket and the inventory table, theuser_metadata field of the S3 object using the key of `description`.
The row should have a thumbnail image/video, description, and a delete button.
Description will come from the inventory table, the user_metadata field of the S3 object using the key of `description`.

On delete, delete the image/video from S3 bucket and the inventory table.
On row click, open a modal with the ImageViewer component inside of the modal.

## App.tsx Component
Update App.tsx component to display a tabbed interface with the following tabs:
- Upload
- List
