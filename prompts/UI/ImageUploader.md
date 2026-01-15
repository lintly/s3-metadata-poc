# UI Prompt
Use React and TypeScript for the UI updates.
We will use AWS SDK for S3 operations.
Follow all standards for React and TypeScript.
Validate linting and formatting.
Ask me about anything that you are not sure of.

Use .env file for all environment variables.
Set the .env file with the following variables:
- VITE_AWS_ACCESS_KEY_ID=xxx
- VITE_AWS_SECRET_ACCESS_KEY=xxx
- VITE_S3_BUCKET_NAME=jeff-poc-meta
- VITE_AWS_REGION=us-west-2
- VITE_S3_BUCKET_REGION=us-west-2

## ImageUploader.tsx Component

### Create Component
Create a new component called `ImageUploader.tsx`.
Create a form for this component with 2 fields and a submit button.
- Field 1: Image/Video File
- Field 2: Description

Make sure we can cover all image and video mime types for desktop, mobile, and tablet.
For videos, the video should be around 10 seconds long.
For images, we want to keep the size to be less than 5MB.
Validate the input fields before submitting the form.

### On Saving
Save image or video to S3 bucket using AWS SDK.
Implement the `onSave` function to handle the saving process.
Send the description and image/video file to the `onSave` function.
The description will be stored in the, inventory table, the user_metadata field of the S3 object using the key of `description`. 

## App.tsx Component
Update App.tsx component to add the component to the App component.
