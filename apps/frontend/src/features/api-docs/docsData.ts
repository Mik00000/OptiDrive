export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  params?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  codeSnippets: {
    JavaScript: string;
    cURL: string;
    Python: string;
    Go: string;
  };
  jsonResponse?: string;
}

export interface DocSection {
  id: string;
  title: string;
  description: string;
  generalGuide?: string;
  headers?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  endpoints?: ApiEndpoint[];
  codeSnippets?: {
    JavaScript: string;
    cURL: string;
    Python: string;
    Go: string;
  };
  jsonResponse?: string;
}

export const DOC_SECTIONS: DocSection[] = [
  {
    id: 'authentication',
    title: 'Authentication',
    description: 'OptiDrive uses API Keys to authenticate requests. You can view and manage your API keys in the API Keys section of the dashboard.',
    generalGuide: `To authenticate your API requests, you must include your API Key in the headers of all requests. 
    
    API keys start with \`op_live_\` for production access. Keep your API keys secure and never share them in public repositories or client-side code.
    
    ### Base URL
    All API requests should be made to:
    \`https://api.optidrive.com\` (or \`http://localhost:3001\` during local development).`,
    headers: [
      { name: 'x-api-key', type: 'string', required: true, description: 'Your workspace API Key (e.g. op_live_123456...)' },
      { name: 'Content-Type', type: 'string', required: false, description: 'Required as "application/json" for POST/PATCH requests, or "multipart/form-data" for file uploads.' }
    ],
    codeSnippets: {
      JavaScript: `// Global fetch configuration example
const API_URL = 'https://api.optidrive.com';
const API_KEY = 'op_live_your_api_key_here';

const apiRequest = async (endpoint, options = {}) => {
  const response = await fetch(\`\${API_URL}\${endpoint}\`, {
    ...options,
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response.json();
};`,
      cURL: `curl -H "x-api-key: op_live_your_api_key_here" \\
     https://api.optidrive.com/api/v1/media`,
      Python: `import requests

API_URL = "https://api.optidrive.com"
headers = {
    "x-api-key": "op_live_your_api_key_here",
    "Content-Type": "application/json"
}

response = requests.get(f"{API_URL}/api/v1/media", headers=headers)
print(response.json())`,
      Go: `package main

import (
	"fmt"
	"net/http"
)

func main() {
	client := &http.Client{}
	req, _ := http.NewRequest("GET", "https://api.optidrive.com/api/v1/media", nil)
	req.Header.Set("x-api-key", "op_live_your_api_key_here")
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	defer resp.Body.Close()
}`
    },
    jsonResponse: `{
  "success": true,
  "data": [],
  "pagination": {
    "total": 0,
    "page": 1,
    "limit": 20,
    "totalPages": 0
  }
}`
  },
  {
    id: 'upload',
    title: 'Upload & Compress',
    description: 'Compress and upload your media files to the OptiDrive CDN. This endpoint accepts multipart/form-data requests.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/compress',
        description: 'Compresses the provided image file using advanced algorithms and uploads it to the CDN.',
        params: [
          { name: 'image', type: 'File', required: true, description: 'The binary image file (JPEG, PNG, WebP, AVIF, GIF, SVG) - Max 10MB.' },
          { name: 'format', type: 'string', required: false, description: 'Target format: webp, avif, jpeg, png, auto (default: auto detects browser support).' },
          { name: 'quality', type: 'number', required: false, description: 'Quality factor from 1 to 100 (default: 80).' },
          { name: 'folderId', type: 'string', required: false, description: 'ID of the folder where the file should be placed.' },
          { name: 'folderPath', type: 'string', required: false, description: 'Path of folders to create on-the-fly (e.g., "blog/covers").' },
          { name: 'tags', type: 'string', required: false, description: 'Comma-separated tags to attach to the file (e.g. "hero,summer").' }
        ],
        codeSnippets: {
          JavaScript: `const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('format', 'webp');
  formData.append('folderPath', 'marketing/logos');
  formData.append('tags', 'logo,vector');

  const response = await fetch('https://api.optidrive.com/api/v1/compress', {
    method: 'POST',
    headers: {
      'x-api-key': 'op_live_your_api_key_here'
      // Browser automatically sets Content-Type to multipart/form-data with boundary
    },
    body: formData
  });

  return await response.json();
};`,
          cURL: `curl -X POST https://api.optidrive.com/api/v1/compress \\
  -H "x-api-key: op_live_your_api_key_here" \\
  -F "image=@/path/to/your/image.png" \\
  -F "format=webp" \\
  -F "folderPath=marketing/logos" \\
  -F "tags=logo,vector"`,
          Python: `import requests

url = "https://api.optidrive.com/api/v1/compress"
headers = {"x-api-key": "op_live_your_api_key_here"}

with open('image.png', 'rb') as f:
    files = {'image': f}
    data = {
        'format': 'webp',
        'folderPath': 'marketing/logos',
        'tags': 'logo,vector'
    }
    response = requests.post(url, headers=headers, files=files, data=data)
    print(response.json())`,
          Go: `package main

import (
	"bytes"
	"io"
	"mime/multipart"
	"net/http"
	"os"
)

func uploadFile(filePath string) {
	file, _ := os.Open(filePath)
	defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	
	part, _ := writer.CreateFormFile("image", "image.png")
	io.Copy(part, file)
	
	writer.WriteField("format", "webp")
	writer.WriteField("folderPath", "marketing/logos")
	writer.WriteField("tags", "logo,vector")
	writer.Close()

	req, _ := http.NewRequest("POST", "https://api.optidrive.com/api/v1/compress", body)
	req.Header.Add("x-api-key", "op_live_your_api_key_here")
	req.Header.Add("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	client.Do(req)
}`
        },
        jsonResponse: `{
  "success": true,
  "message": "Image compressed successfully",
  "data": {
    "id": "file_cld8x9k2m",
    "originalSize": 102450,
    "optimizedSize": 25410,
    "savingsPercent": "75.20",
    "cdnUrl": "https://cdn.optidrive.com/api/v1/media/ws_98jfk/logo-cld8x9k2m.webp",
    "format": "webp"
  }
}`
      }
    ]
  },
  {
    id: 'media',
    title: 'Media Files',
    description: 'Retrieve lists of processed media or delete them. Deleted files are stored in the Trash.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/media',
        description: 'Fetch files from your workspace with optional search, format, tag, and folder filters.',
        params: [
          { name: 'page', type: 'number', required: false, description: 'Page number for pagination (default: 1).' },
          { name: 'limit', type: 'number', required: false, description: 'Number of items per page (default: 20).' },
          { name: 'search', type: 'string', required: false, description: 'Search term matched against the file name.' },
          { name: 'format', type: 'string', required: false, description: 'Filter by format: webp, avif, jpeg, png, gif, svg.' },
          { name: 'tag', type: 'string', required: false, description: 'Filter by specific tag name(s). Comma-separated for multiple tags.' },
          { name: 'operator', type: 'string', required: false, description: 'Logic for multiple tags: AND or OR (default: OR).' },
          { name: 'folderId', type: 'string', required: false, description: 'Filter by folder ID (pass "null" to fetch files in the root folder).' }
        ],
        codeSnippets: {
          JavaScript: `// Fetch paginated media files from root directory
fetch('https://api.optidrive.com/api/v1/media?folderId=null&page=1&limit=10', {
  headers: { 'x-api-key': 'op_live_your_api_key_here' }
})
.then(res => res.json())
.then(data => console.log(data));`,
          cURL: `curl -H "x-api-key: op_live_your_api_key_here" \\
  "https://api.optidrive.com/api/v1/media?folderId=null&page=1&limit=10"`,
          Python: `import requests
response = requests.get(
    "https://api.optidrive.com/api/v1/media",
    headers={"x-api-key": "op_live_your_api_key_here"},
    params={"folderId": "null", "page": 1, "limit": 10}
)
print(response.json())`,
          Go: `package main

import (
	"fmt"
	"io"
	"net/http"
)

func main() {
	req, _ := http.NewRequest("GET", "https://api.optidrive.com/api/v1/media?folderId=null", nil)
	req.Header.Set("x-api-key", "op_live_your_api_key_here")

	resp, _ := (&http.Client{}).Do(req)
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
        },
        jsonResponse: `{
  "success": true,
  "data": [
    {
      "id": "file_cld8x9k2m",
      "name": "banner.jpg",
      "format": "webp",
      "originalSize": "250491",
      "optimizedSize": "49012",
      "savings": 80.43,
      "cdnUrl": "https://cdn.optidrive.com/api/v1/media/ws_1/banner.webp",
      "createdAt": "2026-06-29T18:00:00.000Z",
      "folderId": null,
      "tags": []
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}`
      },
      {
        method: 'DELETE',
        path: '/api/v1/media/:id',
        description: 'Moves the specified file to the trash folder. It will be permanently purged after 30 days.',
        params: [
          { name: 'id', type: 'string', required: true, description: 'The unique ID of the media file to delete.' }
        ],
        codeSnippets: {
          JavaScript: `fetch('https://api.optidrive.com/api/v1/media/file_cld8x9k2m', {
  method: 'DELETE',
  headers: { 'x-api-key': 'op_live_your_api_key_here' }
})
.then(res => res.json());`,
          cURL: `curl -X DELETE -H "x-api-key: op_live_your_api_key_here" \\
  https://api.optidrive.com/api/v1/media/file_cld8x9k2m`,
          Python: `import requests
response = requests.delete(
    "https://api.optidrive.com/api/v1/media/file_cld8x9k2m",
    headers={"x-api-key": "op_live_your_api_key_here"}
)
print(response.json())`,
          Go: `package main

import (
	"net/http"
)

func main() {
	req, _ := http.NewRequest("DELETE", "https://api.optidrive.com/api/v1/media/file_cld8x9k2m", nil)
	req.Header.Set("x-api-key", "op_live_your_api_key_here")
	(&http.Client{}).Do(req)
}`
        },
        jsonResponse: `{
  "success": true,
  "message": "File moved to Trash"
}`
      }
    ]
  },
  {
    id: 'folders',
    title: 'Folders',
    description: 'Organize files inside logical nested folders. Folders API helps you query or build custom folder structures.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/folders',
        description: 'Retrieves all folders in your workspace as a flat list with parent-child references.',
        codeSnippets: {
          JavaScript: `fetch('https://api.optidrive.com/api/v1/folders', {
  headers: { 'x-api-key': 'op_live_your_api_key_here' }
})
.then(res => res.json());`,
          cURL: `curl -H "x-api-key: op_live_your_api_key_here" https://api.optidrive.com/api/v1/folders`,
          Python: `import requests
res = requests.get("https://api.optidrive.com/api/v1/folders", headers={"x-api-key": "op_live_your_api_key_here"})
print(res.json())`,
          Go: `package main

import "net/http"

func main() {
	req, _ := http.NewRequest("GET", "https://api.optidrive.com/api/v1/folders", nil)
	req.Header.Set("x-api-key", "op_live_your_api_key_here")
	(&http.Client{}).Do(req)
}`
        },
        jsonResponse: `{
  "success": true,
  "data": [
    {
      "id": "folder_xyz",
      "name": "marketing",
      "color": "#10b981",
      "parentId": null,
      "createdAt": "2026-06-29T18:00:00.000Z"
    }
  ]
}`
      },
      {
        method: 'POST',
        path: '/api/v1/folders',
        description: 'Creates a new folder under the specified parent folder.',
        params: [
          { name: 'name', type: 'string', required: true, description: 'The folder display name (e.g. "Assets").' },
          { name: 'parentId', type: 'string', required: false, description: 'Parent folder ID for nesting (null for root).' },
          { name: 'color', type: 'string', required: false, description: 'Hex color value for UI marks (default: #3b82f6).' }
        ],
        codeSnippets: {
          JavaScript: `fetch('https://api.optidrive.com/api/v1/folders', {
  method: 'POST',
  headers: {
    'x-api-key': 'op_live_your_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'logos',
    parentId: 'folder_xyz',
    color: '#3b82f6'
  })
})
.then(res => res.json());`,
          cURL: `curl -X POST https://api.optidrive.com/api/v1/folders \\
  -H "x-api-key: op_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "logos", "parentId": "folder_xyz", "color": "#3b82f6"}'`,
          Python: `import requests
requests.post(
    "https://api.optidrive.com/api/v1/folders",
    headers={"x-api-key": "op_live_your_api_key_here", "Content-Type": "application/json"},
    json={"name": "logos", "parentId": "folder_xyz"}
)`,
          Go: `package main

import (
	"bytes"
	"net/http"
)

func main() {
	payload := []byte(\`{"name": "logos", "parentId": "folder_xyz"}\`)
	req, _ := http.NewRequest("POST", "https://api.optidrive.com/api/v1/folders", bytes.NewBuffer(payload))
	req.Header.Set("x-api-key", "op_live_your_api_key_here")
	req.Header.Set("Content-Type", "application/json")
	(&http.Client{}).Do(req)
}`
        },
        jsonResponse: `{
  "success": true,
  "data": {
    "id": "folder_abc",
    "name": "logos",
    "color": "#3b82f6",
    "parentId": "folder_xyz",
    "createdAt": "2026-06-29T18:05:00.000Z"
  }
}`
      },
      {
        method: 'DELETE',
        path: '/api/v1/folders/:id',
        description: 'Moves the specified folder and all its contents (including subfolders and files) to the trash.',
        params: [
          { name: 'id', type: 'string', required: true, description: 'The unique ID of the folder to delete.' }
        ],
        codeSnippets: {
          JavaScript: `fetch('https://api.optidrive.com/api/v1/folders/folder_xyz', {
  method: 'DELETE',
  headers: { 'x-api-key': 'op_live_your_api_key_here' }
})
.then(res => res.json());`,
          cURL: `curl -X DELETE -H "x-api-key: op_live_your_api_key_here" \\
  https://api.optidrive.com/api/v1/folders/folder_xyz`,
          Python: `import requests
requests.delete(
    "https://api.optidrive.com/api/v1/folders/folder_xyz",
    headers={"x-api-key": "op_live_your_api_key_here"}
)`,
          Go: `package main

import "net/http"

func main() {
	req, _ := http.NewRequest("DELETE", "https://api.optidrive.com/api/v1/folders/folder_xyz", nil)
	req.Header.Set("x-api-key", "op_live_your_api_key_here")
	(&http.Client{}).Do(req)
}`
        },
        jsonResponse: `{
  "success": true,
  "message": "Folder moved to Trash"
}`
      },
      {
        method: 'POST',
        path: '/api/v1/folders/:id/restore',
        description: 'Restores a soft-deleted folder and all its nested contents (folders and files) back to active storage.',
        params: [
          { name: 'id', type: 'string', required: true, description: 'The unique ID of the folder to restore.' }
        ],
        codeSnippets: {
          JavaScript: `fetch('https://api.optidrive.com/api/v1/folders/folder_xyz/restore', {
  method: 'POST',
  headers: { 'x-api-key': 'op_live_your_api_key_here' }
})
.then(res => res.json());`,
          cURL: `curl -X POST -H "x-api-key: op_live_your_api_key_here" \\
  https://api.optidrive.com/api/v1/folders/folder_xyz/restore`,
          Python: `import requests
requests.post(
    "https://api.optidrive.com/api/v1/folders/folder_xyz/restore",
    headers={"x-api-key": "op_live_your_api_key_here"}
)`,
          Go: `package main
 
import "net/http"
 
func main() {
	req, _ := http.NewRequest("POST", "https://api.optidrive.com/api/v1/folders/folder_xyz/restore", nil)
	req.Header.Set("x-api-key", "op_live_your_api_key_here")
	(&http.Client{}).Do(req)
}`
        },
        jsonResponse: `{
  "success": true,
  "message": "Folder restored successfully"
}`
      }
    ]
  },
  {
    id: 'tags',
    title: 'Tags',
    description: 'Tags help you group media assets across folders. Ideal for labeling content categories.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/tags',
        description: 'Lists all tags created in your workspace.',
        codeSnippets: {
          JavaScript: `fetch('https://api.optidrive.com/api/v1/tags', {
  headers: { 'x-api-key': 'op_live_your_api_key_here' }
})
.then(res => res.json());`,
          cURL: `curl -H "x-api-key: op_live_your_api_key_here" https://api.optidrive.com/api/v1/tags`,
          Python: `import requests
requests.get("https://api.optidrive.com/api/v1/tags", headers={"x-api-key": "op_live_your_api_key_here"})`,
          Go: `package main

import "net/http"

func main() {
	req, _ := http.NewRequest("GET", "https://api.optidrive.com/api/v1/tags", nil)
	req.Header.Set("x-api-key", "op_live_your_api_key_here")
	(&http.Client{}).Do(req)
}`
        },
        jsonResponse: `{
  "success": true,
  "data": [
    {
      "id": "tag_1",
      "name": "hero",
      "color": "#3b82f6",
      "createdAt": "2026-06-29T18:00:00.000Z"
    }
  ]
}`
      },
      {
        method: 'POST',
        path: '/api/v1/tags',
        description: 'Creates a new tag category.',
        params: [
          { name: 'name', type: 'string', required: true, description: 'Unique tag name (e.g. "banners").' },
          { name: 'color', type: 'string', required: false, description: 'Hex code for visual representations.' }
        ],
        codeSnippets: {
          JavaScript: `fetch('https://api.optidrive.com/api/v1/tags', {
  method: 'POST',
  headers: {
    'x-api-key': 'op_live_your_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ name: 'banners', color: '#10b981' })
})
.then(res => res.json());`,
          cURL: `curl -X POST https://api.optidrive.com/api/v1/tags \\
  -H "x-api-key: op_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "banners", "color": "#10b981"}'`,
          Python: `import requests
requests.post(
    "https://api.optidrive.com/api/v1/tags",
    headers={"x-api-key": "op_live_your_api_key_here", "Content-Type": "application/json"},
    json={"name": "banners", "color": "#10b981"}
)`,
          Go: `package main

import (
	"bytes"
	"net/http"
)

func main() {
	payload := []byte(\`{"name": "banners", "color": "#10b981"}\`)
	req, _ := http.NewRequest("POST", "https://api.optidrive.com/api/v1/tags", bytes.NewBuffer(payload))
	req.Header.Set("x-api-key", "op_live_your_api_key_here")
	req.Header.Set("Content-Type", "application/json")
	(&http.Client{}).Do(req)
}`
        },
        jsonResponse: `{
  "success": true,
  "data": {
    "id": "tag_2",
    "name": "banners",
    "color": "#10b981",
    "createdAt": "2026-06-29T18:10:00.000Z"
  }
}`
      },
      {
        method: 'PATCH',
        path: '/api/v1/tags/:id',
        description: 'Updates the specified tag name or color.',
        params: [
          { name: 'id', type: 'string', required: true, description: 'The unique ID of the tag.' },
          { name: 'name', type: 'string', required: false, description: 'New tag name.' },
          { name: 'color', type: 'string', required: false, description: 'New Hex code color.' }
        ],
        codeSnippets: {
          JavaScript: `fetch('https://api.optidrive.com/api/v1/tags/tag_2', {
  method: 'PATCH',
  headers: {
    'x-api-key': 'op_live_your_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ name: 'updated-banner', color: '#3b82f6' })
})
.then(res => res.json());`,
          cURL: `curl -X PATCH https://api.optidrive.com/api/v1/tags/tag_2 \\
  -H "x-api-key: op_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "updated-banner", "color": "#3b82f6"}'`,
          Python: `import requests
requests.patch(
    "https://api.optidrive.com/api/v1/tags/tag_2",
    headers={"x-api-key": "op_live_your_api_key_here", "Content-Type": "application/json"},
    json={"name": "updated-banner"}
)`,
          Go: `package main

import (
	"bytes"
	"net/http"
)

func main() {
	payload := []byte(\`{"name": "updated-banner"}\`)
	req, _ := http.NewRequest("PATCH", "https://api.optidrive.com/api/v1/tags/tag_2", bytes.NewBuffer(payload))
	req.Header.Set("x-api-key", "op_live_your_api_key_here")
	req.Header.Set("Content-Type", "application/json")
	(&http.Client{}).Do(req)
}`
        },
        jsonResponse: `{
  "success": true,
  "data": {
    "id": "tag_2",
    "name": "updated-banner",
    "color": "#3b82f6",
    "createdAt": "2026-06-29T18:10:00.000Z"
  }
}`
      },
      {
        method: 'DELETE',
        path: '/api/v1/tags/:id',
        description: 'Permanently deletes the specified tag and disconnects it from all connected media files.',
        params: [
          { name: 'id', type: 'string', required: true, description: 'The unique ID of the tag.' }
        ],
        codeSnippets: {
          JavaScript: `fetch('https://api.optidrive.com/api/v1/tags/tag_2', {
  method: 'DELETE',
  headers: { 'x-api-key': 'op_live_your_api_key_here' }
})
.then(res => res.json());`,
          cURL: `curl -X DELETE -H "x-api-key: op_live_your_api_key_here" \\
  https://api.optidrive.com/api/v1/tags/tag_2`,
          Python: `import requests
requests.delete("https://api.optidrive.com/api/v1/tags/tag_2", headers={"x-api-key": "op_live_your_api_key_here"})`,
          Go: `package main

import "net/http"

func main() {
	req, _ := http.NewRequest("DELETE", "https://api.optidrive.com/api/v1/tags/tag_2", nil)
	req.Header.Set("x-api-key", "op_live_your_api_key_here")
	(&http.Client{}).Do(req)
}`
        },
        jsonResponse: `{
  "success": true,
  "message": "Tag deleted successfully"
}`
      }
    ]
  },
  {
    id: 'trash',
    title: 'Trash & Recovery',
    description: 'Manage files and folders that have been soft-deleted. Items will be purged automatically after 30 days.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/trash',
        description: 'Returns all soft-deleted files and folders inside the workspace.',
        codeSnippets: {
          JavaScript: `fetch('https://api.optidrive.com/api/v1/trash', {
  headers: { 'x-api-key': 'op_live_your_api_key_here' }
})
.then(res => res.json());`,
          cURL: `curl -H "x-api-key: op_live_your_api_key_here" https://api.optidrive.com/api/v1/trash`,
          Python: `import requests
requests.get("https://api.optidrive.com/api/v1/trash", headers={"x-api-key": "op_live_your_api_key_here"})`,
          Go: `package main

import "net/http"

func main() {
	req, _ := http.NewRequest("GET", "https://api.optidrive.com/api/v1/trash", nil)
	req.Header.Set("x-api-key", "op_live_your_api_key_here")
	(&http.Client{}).Do(req)
}`
        },
        jsonResponse: `{
  "success": true,
  "data": {
    "files": [
      {
        "id": "file_deleted_1",
        "name": "old-logo.png",
        "deletedAt": "2026-06-29T12:00:00.000Z"
      }
    ],
    "folders": []
  }
}`
      },
      {
        method: 'POST',
        path: '/api/v1/media/:id/restore',
        description: 'Restores a soft-deleted file back to its original folder.',
        params: [
          { name: 'id', type: 'string', required: true, description: 'The unique ID of the file to restore.' }
        ],
        codeSnippets: {
          JavaScript: `fetch('https://api.optidrive.com/api/v1/media/file_deleted_1/restore', {
  method: 'POST',
  headers: { 'x-api-key': 'op_live_your_api_key_here' }
})
.then(res => res.json());`,
          cURL: `curl -X POST -H "x-api-key: op_live_your_api_key_here" \\
  https://api.optidrive.com/api/v1/media/file_deleted_1/restore`,
          Python: `import requests
requests.post(
    "https://api.optidrive.com/api/v1/media/file_deleted_1/restore",
    headers={"x-api-key": "op_live_your_api_key_here"}
)`,
          Go: `package main

import "net/http"

func main() {
	req, _ := http.NewRequest("POST", "https://api.optidrive.com/api/v1/media/file_deleted_1/restore", nil)
	req.Header.Set("x-api-key", "op_live_your_api_key_here")
	(&http.Client{}).Do(req)
}`
        },
        jsonResponse: `{
  "success": true,
  "message": "File restored successfully"
}`
      },
      {
        method: 'POST',
        path: '/api/v1/folders/:id/restore',
        description: 'Restores a soft-deleted folder and all its nested content (folders and files).',
        params: [
          { name: 'id', type: 'string', required: true, description: 'The unique ID of the folder to restore.' }
        ],
        codeSnippets: {
          JavaScript: `fetch('https://api.optidrive.com/api/v1/folders/folder_xyz/restore', {
  method: 'POST',
  headers: { 'x-api-key': 'op_live_your_api_key_here' }
})
.then(res => res.json());`,
          cURL: `curl -X POST -H "x-api-key: op_live_your_api_key_here" \\
  https://api.optidrive.com/api/v1/folders/folder_xyz/restore`,
          Python: `import requests
requests.post(
    "https://api.optidrive.com/api/v1/folders/folder_xyz/restore",
    headers={"x-api-key": "op_live_your_api_key_here"}
)`,
          Go: `package main
 
import "net/http"
 
func main() {
	req, _ := http.NewRequest("POST", "https://api.optidrive.com/api/v1/folders/folder_xyz/restore", nil)
	req.Header.Set("x-api-key", "op_live_your_api_key_here")
	(&http.Client{}).Do(req)
}`
        },
        jsonResponse: `{
  "success": true,
  "message": "Folder restored successfully"
}`
      },
      {
        method: 'DELETE',
        path: '/api/v1/trash/empty',
        description: 'Permanently deletes all files and folders currently in the trash for your workspace.',
        codeSnippets: {
          JavaScript: `fetch('https://api.optidrive.com/api/v1/trash/empty', {
  method: 'DELETE',
  headers: { 'x-api-key': 'op_live_your_api_key_here' }
})
.then(res => res.json());`,
          cURL: `curl -X DELETE -H "x-api-key: op_live_your_api_key_here" \\
  https://api.optidrive.com/api/v1/trash/empty`,
          Python: `import requests
requests.delete("https://api.optidrive.com/api/v1/trash/empty", headers={"x-api-key": "op_live_your_api_key_here"})`,
          Go: `package main
 
import "net/http"
 
func main() {
	req, _ := http.NewRequest("DELETE", "https://api.optidrive.com/api/v1/trash/empty", nil)
	req.Header.Set("x-api-key", "op_live_your_api_key_here")
	(&http.Client{}).Do(req)
}`
        },
        jsonResponse: `{
  "success": true,
  "message": "Trash emptied successfully"
}`
      }
    ]
  },
  {
    id: 'webhooks',
    title: 'Webhooks Receiver',
    description: 'Listen to real-time image optimization events and notify your system instantly.',
    generalGuide: `Webhooks allow OptiDrive to ping your server whenever certain actions happen in your workspace.
    
    ### Supported Events
    We trigger webhook payloads for the following events:
    - \`file.optimized\` - Triggered when a new image file is uploaded, optimized, and saved.
    - \`file.deleted\` - Triggered when a file is moved to the Trash.
    - \`file.restored\` - Triggered when a file is restored from the Trash.
    - \`folder.created\` - Triggered when a new folder is created in the workspace.
    - \`folder.deleted\` - Triggered when a folder and its contents are moved to the Trash.
    
    ### Payload Examples
    **For folder events (\`folder.created\`, \`folder.deleted\`):**
    \`\`\`json
    {
      "event": "folder.created",
      "createdAt": "2026-06-30T12:00:00.000Z",
      "data": {
        "id": "folder_xyz",
        "name": "Marketing Assets",
        "parentId": "folder_abc"
      }
    }
    \`\`\`
    
    **For file state changes (\`file.deleted\`, \`file.restored\`):**
    \`\`\`json
    {
      "event": "file.deleted",
      "createdAt": "2026-06-30T12:00:00.000Z",
      "data": {
        "id": "file_cld8x9k2m",
        "name": "logo.png",
        "deletedAt": "2026-06-30T12:00:00.000Z"
      }
    }
    \`\`\`
    
    ### HMAC-SHA256 Payload Signature
    For security reasons, every webhook request sent from OptiDrive includes an \`X-OptiDrive-Signature\` header. 
    You must verify this header using your Webhook's Secret Key (generated when creating the webhook).
    
    The signature is calculated as \`sha256=hmac_hex(payload, secret)\`.`,
    codeSnippets: {
      JavaScript: `const crypto = require('crypto');
const express = require('express');
const app = express();

app.post('/webhook-endpoint', express.json(), (req, res) => {
  const signature = req.headers['x-optidrive-signature'];
  const payload = JSON.stringify(req.body);
  
  const expected = 'sha256=' + crypto
    .createHmac('sha256', 'your_webhook_secret_here')
    .update(payload)
    .digest('hex');

  if (signature !== expected) {
    return res.status(401).send('Signature mismatch');
  }

  const { event, data } = req.body;
  console.log(\`Received event \${event} for file \${data.name}\`);
  res.sendStatus(200);
});`,
      cURL: `# The payload structure sent to your webhook URL
# Header: X-OptiDrive-Signature: sha256=abcdef...`,
      Python: `import hmac
import hashlib
from flask import Flask, request, abort

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-OptiDrive-Signature')
    payload = request.data
    
    expected = 'sha256=' + hmac.new(
        b"your_webhook_secret_here",
        payload,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(signature, expected):
        abort(401)
        
    # Process event
    return "success", 200`,
      Go: `package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
)

func verifyWebhook(w http.ResponseWriter, r *http.Request) {
	signature := r.Header.Get("X-OptiDrive-Signature")
	body, _ := io.ReadAll(r.Body)

	mac := hmac.New(sha256.New, []byte("your_webhook_secret_here"))
	mac.Write(body)
	expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	if signature != expected {
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}
	w.WriteHeader(http.StatusOK)
}`
    },
    jsonResponse: `{
  "event": "file.optimized",
  "createdAt": "2026-06-29T18:00:00.000Z",
  "data": {
    "id": "file_cld8x9k2m",
    "name": "logo.png",
    "format": "webp",
    "originalSize": 102450,
    "optimizedSize": 25410,
    "savings": 75.20,
    "cdnUrl": "https://cdn.optidrive.com/api/v1/media/ws_98jfk/logo-cld8x9k2m.webp",
    "createdAt": "2026-06-29T18:00:00.000Z"
  }
}`
  },
  {
    id: 'dynamic-transformations',
    title: 'Dynamic Transformations',
    description: 'Transform, resize, crop, and convert image formats on-the-fly using URL parameters.',
    generalGuide: `OptiDrive supports dynamic, on-the-fly image transformations via URL query parameters. You can resize, adjust quality, or change formats on the fly. 
    
    All transformed images are cached automatically at the edge (CDN) using Cache-Control headers to ensure lightning-fast subsequent loads.
    
    ### Dynamic URL Parameters
    You can append the following query parameters to any media file view URL:
    - \`w\` or \`width\` (number): Set target width in pixels (e.g. \`w=500\`).
    - \`h\` or \`height\` (number): Set target height in pixels (e.g. \`h=300\`).
    - \`q\` or \`quality\` (number, 1-100): Set compression quality (default is \`80\`).
    - \`f\` or \`format\` (\`webp\`, \`avif\`, \`png\`, \`jpeg\`, \`gif\`): Convert image format on the fly (default is \`webp\`).
    - \`fit\` (\`cover\`, \`contain\`, \`fill\`, \`inside\`, \`outside\`): Resize fit strategy (default is \`cover\`).
    
    ### How to Request
    You can request optimized media through public view paths:
    1. **Public View URL:** Global view URL:
       \`https://api.optidrive.com/api/public/media/view/:fileId?w=300\`
    2. **Developer API CDN URL:** Raw view path using workspace scope:
       \`https://api.optidrive.com/api/v1/media/:workspaceId/:filename?w=300\``,
    codeSnippets: {
      JavaScript: `// Fetching a dynamically resized WebP image at 150px
const imageUrl = 'https://api.optidrive.com/api/public/media/view/file_avatar_123?w=150&h=150&fit=cover&f=webp&q=85';

const imgElement = document.createElement('img');
imgElement.src = imageUrl;
imgElement.alt = 'Optimized Image';
document.body.appendChild(imgElement);`,
      cURL: `# Get optimized image in AVIF format with width 400px
curl -I "https://api.optidrive.com/api/public/media/view/file_cld8x9k2m?w=400&f=avif"`,
      Python: `# Constructing and checking an optimized image URL
import requests

FILE_ID = "file_cld8x9k2m"
API_URL = "api.optidrive.com"
params = {
    "width": 800,
    "quality": 85,
    "format": "webp"
}

url = f"https://{API_URL}/api/public/media/view/{FILE_ID}"
response = requests.head(url, params=params)
print(f"Content Type: {response.headers.get('Content-Type')}")
print(f"Cache Status: {response.headers.get('Cache-Control')}")`,
      Go: `package main

import (
	"fmt"
	"net/http"
)

func main() {
	// Construct optimized media URL
	url := "https://api.optidrive.com/api/public/media/view/file_cld8x9k2m?w=600&h=400&fit=contain"
	
	resp, err := http.Head(url)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	defer resp.Body.Close()
	fmt.Println("Status:", resp.Status)
}`
    }
  },
  {
    id: 'custom-domains',
    title: 'Custom Domains',
    description: 'Deliver your assets and share links securely using your own branded custom domains.',
    generalGuide: `You can brand your public share links and media delivery URLs by connecting your own custom domains.
    
    ### Configuring DNS Records
    To configure a custom domain, you need to add a **CNAME** record at your DNS provider pointing to our edge server:
    - **Type:** \`CNAME\`
    - **Name:** \`media\` (or your desired subdomain like \`assets\`, \`cdn\`)
    - **Target:** \`cname.optidrive.com\`
    - **TTL:** \`Automatic\` or \`1 Hour\`
    
    ### Verifying Domain Setup
    Once the DNS record is added, navigate to the **Workspace Settings > Domains** tab in the dashboard, add your domain, and click **Verify Setup**. Once verified, its status changes to \`ACTIVE\`.
    
    ### Deliver Media via Custom Domain
    Use the domain name prefix directly for public view routes:
    \`https://media.company.com/view/:fileId?w=300\`
    
    Or use it in share links:
    \`https://media.company.com/s/:shareSlug\``,
    codeSnippets: {
      JavaScript: `// Accessing public share links via branded custom domain
const shareUrl = 'https://media.mycompany.com/s/link_slug_123';
console.log('Share Link:', shareUrl);`,
      cURL: `# Test connection to your custom domain view endpoint
curl -I "https://media.mycompany.com/view/file_cld8x9k2m?w=500"`,
      Python: `# Fetching media content using custom domain prefix
import requests

DOMAIN = "media.mycompany.com"
FILE_ID = "file_cld8x9k2m"

url = f"https://{DOMAIN}/view/{FILE_ID}"
response = requests.get(url, params={"w": 300})
if response.status_code == 200:
    print("Asset fetched successfully via custom domain")`,
      Go: `package main

import (
	"fmt"
	"net/http"
)

func main() {
	// Access share links via custom domain
	url := "https://media.mycompany.com/s/link_slug_123"
	
	resp, err := http.Get(url)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	defer resp.Body.Close()
	fmt.Println("Branded Share Link Status:", resp.Status)
}`
    }
  }
];
