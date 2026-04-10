import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, type = 'website', image, url }) {
  const siteName = 'The People Book';
  const defaultDescription = 'A privacy-first social network. Before the feeds. Before the ads. Before your attention was the product.';
  const pageTitle = title ? `${title} | ${siteName}` : siteName;
  const pageDescription = description || defaultDescription;

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:site_name" content={siteName} />
      {url && <meta property="og:url" content={url} />}
      {image && <meta property="og:image" content={image} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  );
}
