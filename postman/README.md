# Postman collection

Import `relconv-schema.postman_collection.json`.

Collection variables:

- `baseUrl` = `http://127.0.0.1:8000`
- `keyId` = `billing-api`
- `secret` = `dev-billing-secret`

Pre-request script mints:

```text
Authorization: Bearer relconv1.<keyId>.<ts>.<nonce>.<sig>
```

Write endpoints: set `keyId=admin-api`, `secret=dev-admin-secret`.
