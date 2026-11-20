export const pageHead = (title: string, description: string) => () => ({
  meta: [
    { title: `${title} · MList` }, { name: "description", content: description },
    { property: "og:title", content: `${title} · MList` }, { property: "og:description", content: description },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ],
});
