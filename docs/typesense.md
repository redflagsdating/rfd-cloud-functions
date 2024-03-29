# Typesense Search

TODO

```bash

curl https://typesense-jlh2tam2sa-ts.a.run.app/keys \
-X GET \
-H "X-TYPESENSE-API-KEY: AIzaSyBEj_-A5eYxCeKkqQSx6Q19bVZIWIXidHA"


curl https://typesense-jlh2tam2sa-ts.a.run.app/collections/users \
-X GET \
-H "X-TYPESENSE-API-KEY: AIzaSyBEj_-A5eYxCeKkqQSx6Q19bVZIWIXidHA"


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

https://cloud.google.com/sdk/docs/install

Mount Cloud Storage Volume to Cloud Run
https://cloud.google.com/run/docs/configuring/services/cloud-storage-volume-mounts#yaml

gcloud beta run services update typesense \
--execution-environment gen2 \
--add-volume=name=typesense_storage,type=cloud-storage,bucket=typesense_au_bucket \
--add-volume-mount=volume=typesense_storage,mount-path=/data

Ensure to grant storage bucket permissions to Cloud Run Service account
Storage Legacy Bucket Owner
Storage Legacy Object Owner