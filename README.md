# Wash Day Management System

## File Requirements
- Put a header image at `/public/headerImage.png`
- fill out a `.env` file based on `.env.example` 

## Credentials Requirements
The app uses the `google-auth-library` client for authentication.

A Service Account Credentials [JSON file](https://cloud.google.com/nodejs/docs/reference/google-auth-library/latest#download-your-service-account-credentials-json-file) must be available on your system. Set the path to the credentials file as `GOOGLE_APPLICATION_CREDENTIALS` in your `.env` 

## Database Requirements
- In prod, the app runs with an in-memory sqlite db that loads data from Google Sheets at startup.
- When developing locally, the app runs from a .db file on disk - this enables us to inspect state with a SQL client and offload the drop/migrate/seed startup path to a separate process so that `nodemon` can watch files without constantly reseeding
- To develop locally, touch a bare `.db` file and set the path to it in `.env`, and set up a test google sheets backend. The app is stateless and the google sheets holds the state

## Running Locally
To start the app, run
```shell
yarn app:dev
```
To automatically recompile styles as you make changes, in another terminal run
```shell
npx tailwindcss --input public/input.css --output public/output.css --watch
```

## Considerations for Production
You should only run one instance of the app at a time. Since the sqlite datastore is local to each process, writes are not replicated between nodes until the process restarts and seeds its local datastore from Google Sheets. If you need to manually manipulate data, you may edit the Google Sheets spreadsheet and restart the app. 

## Deploying to production
This repo contains configuration files for deploying to [fly.io](https://fly.io).

On a system with `flyctl` installed, copy `fly.toml.example` to `fly.toml` and fill in your desired app name and region.

Then run the deploy command in the project root to deploy to `${your app name}.fly.dev`.
```shell
# if this is the first deploy of a new app
fly launch

# if this is an update to a deployed app
fly deploy --strategy immediate
```

Fly provisions 2 nodes by default when launching an app for the first time. Immediately deprovision 1 so that you don't have inconsistency.
```shell
fly scale count 1
```

There are no major design decisions that couple the app to `fly.io` infrastructure. The `Dockerfile` can be used to build a container image for any platform.

## TODO:
- re-implement `archive a washday` function -- keep a temporary local backup that can `undo` an archive action, but isn't synced to Google Sheets
- add a `location` dimension to people
- fix CSS bug that is causes inconsistent form submit button background color in `src/_views/washDays/bagCard.hbs` and `partials/bags/hiddenForm.hbs` -- sometimes a class will be applied with `background_color: transparent;`. There is likely a conflict or hierarchy issue from the generated tailwind styles. See main at `fc2e8f70` before reverting this to white/back.
- use `crypto` to encrypt `personName` at rest in the DB
- investigate libraries for replicating sqlite (e.g., [litestream](https://litestream.io/)) or migrate to a real database backend to enable horizontal scaling.
