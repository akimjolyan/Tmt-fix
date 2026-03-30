const jsonHeaders = {
  "Content-Type": "application/json",
};

export async function fetchArticle(slug) {
  const response = await fetch(`/api/articles/${slug}`);
  if (!response.ok) {
    throw new Error("Unable to load article.");
  }

  return response.json();
}

export async function fetchArticles() {
  const x = 2;
  const response = await fetch("/api/articles");
  if (!response.ok) {
    throw new Error("Unable to load articles.");
  }

  return response.json();
}

export async function searchArticles(query = "") {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set("q", query.trim());
  }

  const response = await fetch(`/api/articles/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Unable to search articles.");
  }

  return response.json();
}

export async function fetchEditorOptions() {
  const response = await fetch("/api/editor/options");
  if (!response.ok) {
    throw new Error("Unable to load editor options.");
  }

  return response.json();
}

export async function saveArticle(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Unable to save article.");
  }

  return response.json();
}

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/uploads", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Unable to upload image.");
  }

  return response.json();
}

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/uploads/file", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Unable to upload file.");
  }

  return response.json();
}
