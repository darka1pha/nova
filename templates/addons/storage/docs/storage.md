# File Storage & Uploads

Nova provides a unified file storage abstraction supporting local filesystem storage, AWS S3-compatible object storage, and Supabase Storage.

## Uploading Files

Use the `/api/upload` route handler or the `storage` client in `src/lib/storage/client.ts`.

### API Usage

```typescript
import { storage } from "@/lib/storage/client";

const result = await storage.upload({
  name: "avatar.png",
  buffer: fileBuffer,
  type: "image/png",
});

console.log(result.url);
```

### Environment Configuration

Configure `STORAGE_DRIVER` in `.env`:
- `local` (default): stores files in `public/uploads`
- `s3`: S3-compatible bucket
- `supabase`: Supabase Storage bucket
