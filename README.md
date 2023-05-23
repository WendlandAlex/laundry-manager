# Wash Day Management System

## File Requirements
- Put a header image at `/public/headerImage.png`
- fill out a `.env` file based on `.env.example` 

## Database Requirements
- In prod, the app runs with an in-memory sqlite db. To run this repo only in prod no db setup is necessary
- When developing localdev, the app runs from a .db file on disk - this enables us to inspect state with a SQL client and offload the drop/migrate/seed startup path to a separate process so that `nodemon` can watch files without constantly reseeding
- To develop locally, touch a bare `.db` file and set the path to it in `.env`, and set up a test google sheets backend. The app is stateless and the google sheets holds the state
