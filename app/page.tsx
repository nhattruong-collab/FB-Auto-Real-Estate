'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, FileText, Sparkles, Send, Play, Square, 
  Trash2, Plus, Image as ImageIcon, CheckCircle2,
  Clock, Activity, Facebook, Settings, Search
} from 'lucide-react';

// --- Types ---
type Post = {
  id: string;
  content: string;
  images: string[]; // Base64 strings
  createdAt: number;
};

// --- Mock Automation Engine Logs ---
function getMockSteps(keywords: string) {
  return [
    `[HỆ THỐNG] Khởi tạo engine tự động hóa...`,
    `[HÀNH ĐỘNG] Mở trình duyệt Chrome.`,
    `[HÀNH ĐỘNG] Truy cập www.facebook.com...`,
    `[TRẠNG THÁI] Đã xác nhận trạng thái đăng nhập.`,
    `[HÀNH ĐỘNG] Tìm kiếm từ khóa: "${keywords || 'Bất động sản'}"`,
    `[HÀNH ĐỘNG] Cuộn trang kết quả (mô phỏng thao tác của người)...`,
    `[HÀNH ĐỘNG] Chọn tham gia nhóm: "Mua Bán Nhà Đất Chính Chủ"`,
    `[HÀNH ĐỘNG] Lấy ngẫu nhiên bài đăng từ thư viện...`,
    `[HÀNH ĐỘNG] Đang soạn nội dung bài viết mới...`,
    `[HÀNH ĐỘNG] Tải lên các file đính kèm...`,
    `[THÀNH CÔNG] Đã đăng bài viết! Bài viết đang chờ duyệt hoặc đã hiển thị.`,
    `[HỆ THỐNG] Kịch bản hoàn thành. Đang vào chế độ ngủ.`
  ];
}

export default function RealEstateAutoDashboard() {
  const [activeTab, setActiveTab] = useState<'posts' | 'ai' | 'automation'>('posts');
  
  // App State
  const [posts, setPosts] = useState<Post[]>([]);
  const [keywords, setKeywords] = useState('Bất động sản Hà Nội, Mua bán nhà đất');
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  
  // Engine State
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [countdown, setCountdown] = useState(0);

  // Load state from local storage on mount
  useEffect(() => {
    const savedPosts = localStorage.getItem('re_posts');
    const savedKey = localStorage.getItem('re_keywords');
    if (savedPosts) setPosts(JSON.parse(savedPosts));
    if (savedKey) setKeywords(savedKey);
  }, []);

  // Save state
  useEffect(() => {
    localStorage.setItem('re_posts', JSON.stringify(posts));
    localStorage.setItem('re_keywords', keywords);
  }, [posts, keywords]);

  const addPost = (content: string, images: string[] = []) => {
    const newPost = { id: Date.now().toString(), content, images, createdAt: Date.now() };
    setPosts([newPost, ...posts]);
  };

  const deletePost = (id: string) => {
    setPosts(posts.filter(p => p.id !== id));
  };

  // --- Automation Engine Effect ---
  useEffect(() => {
    let tickInterval: NodeJS.Timeout;
    
    if (isRunning) {
      if (logs.length === 0) {
        setLogs([`[${new Date().toLocaleTimeString()}] Bắt đầu chiến dịch tự động đăng bài.`]);
      }
      let stepIndex = 0;
      const steps = getMockSteps(keywords);
      
      const runCycle = () => {
        if (stepIndex < steps.length) {
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${steps[stepIndex]}`]);
          stepIndex++;
        } else {
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Chờ ${intervalMinutes} phút cho chu kỳ tiếp theo...`]);
          setCountdown(30); // 30 seconds demo countdown
          stepIndex = 0;
        }
      };

      tickInterval = setInterval(() => {
        if (countdown > 0) {
          setCountdown(c => c - 1);
        } else {
          runCycle();
        }
      }, 2000);

    } else {
      if (logs.length > 0 && !logs[logs.length-1].includes('Trạng thái chờ')) {
         setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [HỆ THỐNG] Đã dừng. Trạng thái chờ khởi động.`]);
      }
      setCountdown(0);
    }

    return () => clearInterval(tickInterval);
  }, [isRunning, keywords, intervalMinutes, countdown]);


  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Facebook className="w-8 h-8 text-blue-500" />
            <h1 className="text-xl font-bold">AutoFB Pro</h1>
          </div>
          <p className="text-xs text-slate-400">Tự động hóa đăng bài Bất Động Sản</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 flex flex-row md:flex-col overflow-x-auto">
          <button 
            onClick={() => setActiveTab('posts')}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'posts' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <FileText className="w-5 h-5" />
            <span className="hidden md:inline">Kho bài đăng</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('ai')}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'ai' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="hidden md:inline">Tạo nội dung AI</span>
          </button>

          <button 
            onClick={() => setActiveTab('automation')}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'automation' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <Activity className="w-5 h-5" />
            <span className="hidden md:inline">Chiến dịch tự động</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-100/50">
        <div className="p-4 md:p-8 max-w-6xl mx-auto h-full">
          {activeTab === 'posts' && <PostsView posts={posts} addPost={addPost} deletePost={deletePost} />}
          {activeTab === 'ai' && <AIGeneratorView onSave={addPost} />}
          {activeTab === 'automation' && (
            <AutomationView 
              posts={posts}
              keywords={keywords}
              setKeywords={setKeywords}
              intervalMinutes={intervalMinutes}
              setIntervalMinutes={setIntervalMinutes}
              isRunning={isRunning}
              setIsRunning={setIsRunning}
              logs={logs}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// --- Sub Views ---

function PostsView({ posts, addPost, deletePost }: { posts: Post[], addPost: (c: string, i: string[]) => void, deletePost: (id: string) => void }) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  
  // Resize image before storing to save localStorage quota
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const MAX = 600;
        if (width > height && width > MAX) {
          height *= MAX / width; width = MAX;
        } else if (height > MAX) {
          width *= MAX / height; height = MAX;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setImages([...images, canvas.toDataURL('image/jpeg', 0.6)]);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!content.trim()) return;
    addPost(content, images);
    setContent('');
    setImages([]);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="mb-2 shrink-0">
        <h2 className="text-2xl font-bold text-gray-900">Kho bài đăng của bạn</h2>
        <p className="text-gray-500">Quản lý các bài đăng có sẵn để tự động ném vào các group.</p>
      </header>

      {/* Add New */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm shrink-0">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-blue-500"/> Tạo bài đăng thủ công</h3>
        <textarea 
          placeholder="Nội dung bài đăng bán/cho thuê nhà đất..."
          className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none mb-4"
          value={content}
          onChange={e => setContent(e.target.value)}
        />
        
        <div className="flex flex-wrap gap-2 mb-4">
          {images.map((img, idx) => (
             <div key={idx} className="relative w-20 h-20 rounded-lg border border-gray-200 bg-gray-100 overflow-hidden shadow-sm">
               <img src={img} alt="upload" className="object-cover w-full h-full" />
               <button onClick={() => setImages(images.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs shadow hover:bg-red-600"><Trash2 className="w-3 h-3"/></button>
             </div>
          ))}
          {images.length < 3 && (
            <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-blue-400 transition-colors">
              <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
              <span className="text-[10px] text-gray-500 font-medium">Thêm ảnh</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          )}
        </div>

        <div className="flex justify-end">
          <button onClick={handleSave} className="bg-slate-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center gap-2">
            Lưu bài viết
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.length === 0 ? (
            <div className="col-span-1 md:col-span-2 text-center py-16 bg-white border border-dashed border-gray-300 rounded-xl text-gray-500 flex flex-col items-center">
              <FileText className="w-12 h-12 text-gray-200 mb-3" />
              <p>Chưa có bài đăng nào.</p>
              <p className="text-sm mt-1">Hãy tạo bài đăng mới ở trên hoặc qua tab AI.</p>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:border-blue-300 transition-colors">
                <div className="p-5 flex-1">
                  <div className="flex items-center justify-between mb-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1 font-medium"><Clock className="w-4 h-4"/> {new Date(post.createdAt).toLocaleDateString()}</span>
                    <button onClick={() => deletePost(post.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.content.length > 250 ? post.content.substring(0, 250) + '...' : post.content}</div>
                </div>
                {post.images.length > 0 && (
                  <div className="h-32 bg-gray-100 flex overflow-hidden border-t border-gray-100">
                     {post.images.map((img, i) => (
                       <div key={i} className="flex-1 border-r border-white last:border-0 relative group">
                         <img src={img} alt="Post image" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                       </div>
                     ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function AIGeneratorView({ onSave }: { onSave: (c: string) => void }) {
  const [prompt, setPrompt] = useState('');
  const [generated, setGenerated] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      if (data.text) {
        setGenerated(data.text);
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến server.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveToPosts = () => {
    if (generated) {
      onSave(generated);
      setGenerated('');
      setPrompt('');
      alert("Đã thêm vào kho bài đăng!");
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="mb-2 shrink-0">
        <h2 className="text-2xl font-bold text-gray-900">AI Copywriter</h2>
        <p className="text-gray-500">Tạo nội dung bài đăng chuẩn chỉnh bằng cách cung cấp cho AI thông tin nhà đất.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-8 flex-1 min-h-0 pb-8">
        <div className="space-y-4 flex flex-col">
          <label className="block text-sm font-medium text-gray-700">Mô tả thông tin bất động sản</label>
          <textarea 
            placeholder="Ví dụ: Bán nhà mặt phố Giảng Võ, Ba Đình. 55m2 x 5 tầng, mặt tiền 5m. Giá 15 tỷ. Nhà mới đẹp, nội thất nhập khẩu, kinh doanh sầm uất..."
            className="w-full h-48 md:flex-1 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none shadow-sm"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
          />
          <button 
            onClick={handleGenerate} 
            disabled={isLoading || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3.5 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isLoading ? <span className="animate-pulse">Đang viết thần tốc...</span> : <><Sparkles className="w-5 h-5"/> Yêu cầu AI viết bài</>}
          </button>
        </div>

        <div className="space-y-4 flex flex-col">
          <label className="block text-sm font-medium text-gray-700">Kết quả từ AI</label>
          <div className="relative flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
             <textarea 
                readOnly={isLoading}
                placeholder="Bài viết do AI tạo ra sẽ hiển thị ở đây..."
                className="w-full h-48 md:flex-1 p-5 outline-none resize-none bg-transparent"
                value={generated}
                onChange={e => setGenerated(e.target.value)} // allow light edits before save
             />
             {!generated && !isLoading && (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 pointer-events-none bg-gray-50/50">
                 <BotIcon className="w-16 h-16 opacity-30 mb-2" />
                 <span className="text-sm">Đang chờ lệnh...</span>
               </div>
             )}
          </div>
          {generated && (
            <button onClick={saveToPosts} className="w-full bg-slate-900 text-white px-5 py-3.5 rounded-xl font-medium hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 shadow-md shrink-0">
              <CheckCircle2 className="w-5 h-5" /> Lưu vào Kho bài đăng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BotIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
    </svg>
  );
}

function AutomationView({ posts, keywords, setKeywords, intervalMinutes, setIntervalMinutes, isRunning, setIsRunning, logs }: any) {
  
  const endLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endLogRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex h-full flex-col lg:flex-row gap-8 pb-8">
      {/* Settings Side */}
      <div className="w-full lg:w-5/12 flex flex-col shrink-0 gap-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tiến trình tự động</h2>
          <p className="text-gray-500 text-sm mt-1">Cấu hình bot tự động duyệt và đăng nội dung mồi lên các group Facebook.</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Từ khóa tìm kiếm Group</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input 
                 type="text" 
                 disabled={isRunning}
                 placeholder="VD: Mua bán nhà đất Hà Nội, BĐS..." 
                 className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors outline-none" 
                 value={keywords}
                 onChange={e => setKeywords(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">Bot sẽ dùng từ khóa này tìm kiếm các Group mục tiêu, tham gia (nếu cần) và tiến hành đăng bài.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Khoảng nghỉ giữa các nhóm</label>
            <select 
               disabled={isRunning}
               className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 outline-none"
               value={intervalMinutes}
               onChange={e => setIntervalMinutes(Number(e.target.value))}
            >
              <option value={15}>15 phút</option>
              <option value={30}>30 phút</option>
              <option value={60}>1 tiếng (An toàn)</option>
              <option value={120}>2 tiếng</option>
            </select>
          </div>

          <div>
             <label className="block text-sm font-semibold text-gray-800 justify-between items-center flex mb-2">
               Bài viết sẽ đăng
             </label>
             <div className="p-4 bg-indigo-50 text-indigo-900 text-sm rounded-lg border border-indigo-100 flex items-start gap-3">
               <FileText className="w-5 h-5 shrink-0 text-indigo-500 mt-0.5" />
               <div>
                  <span className="font-semibold block mb-0.5">Kho hiện tại: {posts.length} bài.</span>
                  Hệ thống sẽ bốc xuất ngẫu nhiên 2-3 bài viết (chưa từng đăng hôm nay) để đăng luân phiên lên các group, giúp bài không bị trùng lặp.
               </div>
             </div>
          </div>
        </div>

        {/* Action button */}
        {isRunning ? (
           <button onClick={() => setIsRunning(false)} className="w-full bg-red-500 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-lg shadow-red-500/30 shrink-0">
              <Square className="w-6 h-6 fill-current" /> DỪNG TIẾN TRÌNH
           </button>
        ) : (
           <button onClick={() => setIsRunning(true)} className="w-full bg-emerald-500 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed shrink-0" disabled={posts.length === 0}>
             <Play className="w-6 h-6 fill-current" /> BẮT ĐẦU CHẠY BOT
           </button>
        )}
        {!isRunning && posts.length === 0 && <p className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded-lg">Bạn cần thêm bài viết vào kho đẻ chạy được Bot.</p>}
      </div>

      {/* Terminal logs side */}
      <div className="w-full lg:flex-1 h-96 lg:h-auto bg-[#0a0a0a] rounded-xl border border-gray-800 flex flex-col shadow-2xl overflow-hidden font-mono shrink-0 lg:shrink">
        <div className="bg-[#1a1a1a] border-b border-gray-800 px-4 py-3 flex items-center gap-2 shrink-0">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-gray-400 text-xs ml-3 tracking-wider uppercase">AutoFB Terminal</span>
          {isRunning && <span className="ml-auto flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>}
        </div>
        <div className="p-5 overflow-y-auto flex-1 text-sm tracking-tight leading-relaxed">
          {logs.map((log: string, idx: number) => {
             const isWarning = log.includes('Chờ') || log.includes('ngủ');
             const isSuccess = log.includes('THÀNH CÔNG');
             const isAction = log.includes('HÀNH ĐỘNG');
             const isSystem = log.includes('HỆ THỐNG');
             let colorClass = 'text-gray-300';
             if (isWarning) colorClass = 'text-yellow-400/90';
             if (isSuccess) colorClass = 'text-green-400';
             if (isAction) colorClass = 'text-cyan-400/90';
             if (isSystem) colorClass = 'text-purple-400/90';

             return (
              <div key={idx} className={`mb-1.5 ${colorClass}`}>
                {log}
              </div>
            );
          })}
          <div ref={endLogRef} className="h-4" />
        </div>
      </div>

    </div>
  );
}
