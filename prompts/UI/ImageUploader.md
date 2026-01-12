# UI Updates Prompt
Use React and TypeScript for the UI updates.
We will use AWS SDK for S3 operations.
Follow all standards for React and TypeScript.
Validate linting and formatting.

Use .env file for all environment variables.
Set the .env file with the following variables:
- VITE_AWS_ACCESS_KEY_ID=
- VITE_AWS_SECRET_ACCESS_KEY=
- VITE_S3_BUCKET_NAME=jeff-poc-meta
- VITE_AWS_REGION=us-west-2
- VITE_S3_BUCKET_REGION=us-west-2

## ImageUploader.tsx Component
Create a new component called `ImageUploader.tsx`.
Create a form for this component with 2 fields and a submit button.
- Field 1: Image/Video File
- Field 2: Description

Make sure we can cover all image and video mime types for desktop, mobile, and tablet.
The video should be around 10 seconds long and the image should be less than 5MB.
Validate the input fields before submitting the form.

### On Saving
Save image or video to S3 bucket using AWS SDK.
Implement the `onSave` function to handle the saving process.
Send the description and image/video file to the `onSave` function.
The description will be stored in the, inventory table, the user_metadata field of the S3 object using the key of `description`. 

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
