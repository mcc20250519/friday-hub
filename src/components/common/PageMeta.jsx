import { useEffect } from 'react';

/**
 * PageMeta 组件 - 用于动态修改页面 title 和 meta description
 * @param {Object} props
 * @param {string} props.title - 页面标题（不带后缀）
 * @param {string} props.description - 页面描述
 * @param {string} props.suffix - 标题后缀，默认为 " | Friday Hub"
 * @param {string} props.ogTitle - Open Graph 标题（可选，默认使用 title）
 * @param {string} props.ogDescription - Open Graph 描述（可选，默认使用 description）
 * @param {string} props.canonical - 规范 URL（可选）
 */
function PageMeta({
  title,
  description,
  suffix = ' | Friday Hub',
  ogTitle,
  ogDescription,
  canonical,
}) {
  useEffect(() => {
    // 保存原始标题，用于组件卸载时恢复
    const originalTitle = document.title;

    // 设置页面标题
    const fullTitle = title ? `${title}${suffix}` : `Friday Hub${suffix}`;
    document.title = fullTitle;

    // 设置或更新 meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    if (description) {
      metaDescription.setAttribute('content', description);
    }

    // 设置 Open Graph meta 标签
    const ogTitleContent = ogTitle || title;
    const ogDescContent = ogDescription || description;

    // og:title
    let ogTitleTag = document.querySelector('meta[property="og:title"]');
    if (ogTitleContent) {
      if (!ogTitleTag) {
        ogTitleTag = document.createElement('meta');
        ogTitleTag.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitleTag);
      }
      ogTitleTag.setAttribute('content', `${ogTitleContent}${suffix}`);
    }

    // og:description
    let ogDescTag = document.querySelector('meta[property="og:description"]');
    if (ogDescContent) {
      if (!ogDescTag) {
        ogDescTag = document.createElement('meta');
        ogDescTag.setAttribute('property', 'og:description');
        document.head.appendChild(ogDescTag);
      }
      ogDescTag.setAttribute('content', ogDescContent);
    }

    // twitter:title
    let twitterTitleTag = document.querySelector('meta[property="twitter:title"]');
    if (ogTitleContent) {
      if (!twitterTitleTag) {
        twitterTitleTag = document.createElement('meta');
        twitterTitleTag.setAttribute('property', 'twitter:title');
        document.head.appendChild(twitterTitleTag);
      }
      twitterTitleTag.setAttribute('content', `${ogTitleContent}${suffix}`);
    }

    // twitter:description
    let twitterDescTag = document.querySelector('meta[property="twitter:description"]');
    if (ogDescContent) {
      if (!twitterDescTag) {
        twitterDescTag = document.createElement('meta');
        twitterDescTag.setAttribute('property', 'twitter:description');
        document.head.appendChild(twitterDescTag);
      }
      twitterDescTag.setAttribute('content', ogDescContent);
    }

    // 设置 canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', canonical);
    }

    // 清理函数：恢复原始标题和移除动态添加的 meta 标签
    return () => {
      document.title = originalTitle;
      // 注意：这里不移除 meta 标签，因为页面切换时会由下一个 PageMeta 组件覆盖
    };
  }, [title, description, suffix, ogTitle, ogDescription, canonical]);

  // 这个组件不渲染任何 DOM 元素
  return null;
}

export default PageMeta;
