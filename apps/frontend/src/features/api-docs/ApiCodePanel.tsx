'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';
import { Icon } from '@iconify/react';

type Language = 'JavaScript' | 'cURL' | 'Python' | 'Go';

const CODE_SNIPPETS: Record<Language, string> = {
  JavaScript: `const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('optimize', 'true');
  formData.append('format', 'webp');

  const response = await fetch('https://api.optidrive.com/v1/upload', {
    method: 'POST',
    headers: {
      'x-api-key': 'op_live_your_api_key_here',
      // Do not set Content-Type manually when using FormData
    },
    body: formData
  });

  const data = await response.json();
  console.log('CDN URL:', data.url);
  return data;
};`,
  cURL: `curl -X POST https://api.optidrive.com/v1/upload \\
  -H "x-api-key: op_live_your_api_key_here" \\
  -F "image=@/path/to/your/image.jpg" \\
  -F "optimize=true" \\
  -F "format=webp"`,
  Python: `import requests

def upload_image(file_path):
    url = "https://api.optidrive.com/v1/upload"
    headers = {
        "x-api-key": "op_live_your_api_key_here"
    }
    
    with open(file_path, 'rb') as f:
        files = {'image': f}
        data = {
            'optimize': 'true',
            'format': 'webp'
        }
        
        response = requests.post(url, headers=headers, files=files, data=data)
        
    return response.json()`,
  Go: `package main

import (
	"bytes"
	"io"
	"mime/multipart"
	"net/http"
	"os"
)

func uploadImage(filePath string) error {
	file, _ := os.Open(filePath)
	defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	
	part, _ := writer.CreateFormFile("image", "image.jpg")
	io.Copy(part, file)
	
	writer.WriteField("optimize", "true")
	writer.WriteField("format", "webp")
	writer.Close()

	req, _ := http.NewRequest("POST", "https://api.optidrive.com/v1/upload", body)
	req.Header.Add("x-api-key", "op_live_your_api_key_here")
	req.Header.Add("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()

	return nil
}`,
};

const JSON_RESPONSE = `{
  "success": true,
  "file_id": "img_9x2b4m1v",
  "original_size": 2450123,
  "optimized_size": 450982,
  "savings": "81.5%",
  "url": "https://cdn.optidrive.com/v/img_9x2b4m1v.webp"
}`;

export const ApiCodePanel = () => {
  const [activeTab, setActiveTab] = useState<Language>('JavaScript');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CODE_SNIPPETS[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: Language[] = ['JavaScript', 'cURL', 'Python', 'Go'];

  return (
    <div className="flex w-full min-w-0 flex-col xl:h-full">
      {/* Top Header */}
      <div className="flex items-center justify-between px-5 py-4 sm:px-8 sm:pb-4">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-accent/20 text-accent'
                  : 'text-text-light/80 hover:text-text-light hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <Button variant="ghost" onClick={handleCopy}>
          <div className="flex items-center gap-2">
            <Icon
              icon={copied ? 'lucide:check' : 'lucide:copy'}
              className="h-4 w-4"
            />
            <span className="hidden md:block">
              {copied ? 'Copied!' : 'Copy Code'}
            </span>
          </div>
        </Button>
      </div>

      <div className="px-5 pb-6 sm:px-8 sm:pb-8 xl:min-h-0 min-w-0 xl:flex-1 xl:overflow-y-scroll">
        <div className="bg-bg border-border relative mb-6 min-h-0 flex-1 overflow-auto rounded-xl border p-4">
          <pre className="text-text-light font-mono text-sm leading-relaxed whitespace-pre">
            <code>{CODE_SNIPPETS[activeTab]}</code>
          </pre>
        </div>

        <div>
          <h3 className="text-text-muted mb-3 text-sm font-medium">
            Expected JSON Response
          </h3>
          <div className="bg-bg border-border overflow-auto rounded-xl border p-4">
            <pre className="text-text-light font-mono text-sm leading-relaxed whitespace-pre">
              <code>{JSON_RESPONSE}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
