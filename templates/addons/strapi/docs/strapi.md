# Strapi CMS Integration

This addon adds Strapi headless CMS integration to your Next.js application.

## Environment Setup

Add these environment variables to your `.env.local` file:

```bash
# Public Strapi URL (can be a proxy or public endpoint)
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337

# Strapi API token (for authenticated requests)
STRAPI_API_TOKEN=your_api_token_here
```

## Features

- **Typed API Client**: `strapiRequest()` for making authenticated requests
- **Content Queries**: `queryContent()`, `getContentById()`, `getContentBySlug()` utilities
- **Media URL Helper**: `getStrapiMediaUrl()` for image optimization
- **Example Types**: Common content types (BlogPost, Page, Author, Category) ready to customize

## Quick Start

### 1. Query Content

```tsx
import { queryContent } from "@/lib/cms/strapi";
import type { BlogPost } from "@/lib/cms/strapi";

export async function getPosts() {
  const result = await queryContent<BlogPost>("blog-posts", {
    sort: "createdAt:desc",
    limit: 10,
  });
  return result.data;
}
```

### 2. Get a Single Item

```tsx
import { getContentBySlug } from "@/lib/cms/strapi";
import type { Page } from "@/lib/cms/strapi";

export async function getPage(slug: string) {
  const result = await getContentBySlug<Page>("pages", slug);
  return result.data[0];
}
```

### 3. Handle Media URLs

```tsx
import { getStrapiMediaUrl } from "@/lib/cms/strapi";

const imageUrl = getStrapiMediaUrl(post.featured_image?.data?.attributes.url);
```

## Content Types

The addon includes example types for:

- **BlogPost**: Title, slug, content, excerpt, author, featured image, category, tags
- **Page**: Title, slug, content, SEO fields, featured image
- **Author**: Name, email, bio, avatar
- **Category**: Name, slug, description

Customize these in `src/lib/cms/strapi/types.ts` to match your Strapi schema.

## Docker Compose Setup (Optional)

If you selected Docker Compose, Strapi service can be added. For now, configure a remote Strapi instance or run it locally:

```bash
# Run Strapi in development
npx create-strapi-app@latest my-strapi --quickstart
```

## Next Steps

1. Update content types in `src/lib/cms/strapi/types.ts`
2. Create React components that call the query functions
3. Set up data fetching in your pages/routes
4. Configure image optimization in Next.js if using Strapi media

## Resources

- [Strapi Documentation](https://docs.strapi.io)
- [Strapi API Reference](https://docs.strapi.io/dev-docs/api/rest)
- [Strapi Content API Guide](https://docs.strapi.io/dev-docs/api/rest-api)
