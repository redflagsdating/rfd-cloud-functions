# Typesense Search Engine

A self-hosted [Typesense](https://typesense.org/) instance on Google Cloud Run provides users matching by searching with criteria.

## Set up Typesense server on Cloud Run
* Create Typesense API key [Google API and services](https://console.cloud.google.com/apis/credentials/key/da00d0e5-ff75-4cca-8285-5e7f7c9ab5ee?project=rfd-app-prod-1fdad)

* Go to [Google Cloud Run](https://console.cloud.google.com/run?project=rf-app-dev-7145f) and select the right project
* `CREATE SERVICE`
* Choose `Docker Hub`
* Continer Image URL: `typesense/typesense:0.26.0.rc54`
* Container port: `8108`
* service name `typesense`
* Minimum number instance : `0`
* Add volume type `Cloud Storage bucket`
* [Mount Cloud Storage Bucket to Cloud Run](https://cloud.google.com/run/docs/configuring/services/cloud-storage-volume-mounts#yaml)
> Ensure to grant storage bucket permissions, `Storage Legacy Bucket Owner` and `Storage Legacy Object Owner` to Cloud Run Service account
* Firebase [Typesense extension](https://extensions.dev/extensions/typesense/firestore-typesense-search)
* Ensure `TYPESENSE_API_KEY` and `TYPESENSE_API_HOST` in the `.env-{project id}` files

## Initialize Typesense server

Create new collection to start backfill documents.

```bash
curl https://typesense-jlh2tam2sa-ts.a.run.app/collections \
-X POST \
-H "Content-Type: application/json" \
-H "X-TYPESENSE-API-KEY: AIzaSyBEj_-A5eYxCeKkqQSx6Q19bVZIWIXidHA" \
-d '{
  "name": "users",
  "fields": [
    {"name": "dob", "type": "auto" },
    {"name": "createdAt", "type": "auto" },
    {"name": "verified", "type": "bool" },
    {"name": "gender", "type": "string" },
    {"name": "genderFor", "type": "string[]" },
    {"name": "locality", "type": "string" },
    {"name": "redFlags", "type": "string[]" },
    {"name": "greenFlags", "type": "string[]" },
    {"name": "realTalk", "type": "auto" }
  ]
}'
```

To trigger backfill Firestore database to Typesense, just change `trigger` of `typesense_sync` collection in Firestore from `false` to `true`.

<img src="./typesense-backfill.png" width="800">