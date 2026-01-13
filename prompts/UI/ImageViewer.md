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

## ImageViewer.tsx Component
Create a new component called `ImageViewer.tsx`.
Display the image/video file in this component.
Display the description of the image/video from the inventory table, the user_metadata field of the S3 object using the key of `description`.
Place the description in a text area.
Allow the user to edit the description and save the changes.
Allow a user to delete the image/video from S3 bucket and the inventory table.
Allow a user to upload a new version of the image/video.
Add a back button to navigate back to the ImageList component.

## App.tsx Component
Update App.tsx component to display a tabbed interface with the following tabs:
- Upload
- List
