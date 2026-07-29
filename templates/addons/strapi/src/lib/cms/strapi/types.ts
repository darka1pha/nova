/**
 * Strapi content type definitions.
 *
 * These are example types for common content structures.
 * Update these to match your Strapi schema.
 */

export interface StrapiAttribute {
  id: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

/**
 * Example Blog Post content type.
 * Adjust fields to match your Strapi schema.
 */
export interface BlogPost extends StrapiAttribute {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  author?: string;
  featured_image?: {
    data: {
      id: number;
      attributes: {
        url: string;
        name: string;
        alternativeText?: string;
        width: number;
        height: number;
      };
    };
  };
  category?: string;
  tags?: string[];
}

/**
 * Example Page content type.
 */
export interface Page extends StrapiAttribute {
  title: string;
  slug: string;
  content: string;
  seo_title?: string;
  seo_description?: string;
  featured_image?: {
    data: {
      id: number;
      attributes: {
        url: string;
        name: string;
      };
    };
  };
}

/**
 * Example Author content type.
 */
export interface Author extends StrapiAttribute {
  name: string;
  email?: string;
  bio?: string;
  avatar?: {
    data: {
      id: number;
      attributes: {
        url: string;
      };
    };
  };
}

/**
 * Example Category content type.
 */
export interface Category extends StrapiAttribute {
  name: string;
  slug: string;
  description?: string;
}
