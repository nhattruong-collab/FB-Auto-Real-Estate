'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, FileText, Sparkles, Send, Play, Square, 
  Trash2, Plus, Image as ImageIcon, CheckCircle2,
  Clock, Activity, Facebook, Settings, Search, Pencil, MessageSquare,
  Timer, Target, Zap, AlertCircle, Terminal, History, PauseCircle
} from 'lucide-react';

// --- Types & Globals ---
type Post = {
  id: string;
  content: string;
  images: string[]; // Base64 strings
  createdAt: number;
};

type ScenarioAction = {
  type: string; // 'scroll_home' | 'search_and_pick_group' | 'scroll_current_page' | 'post_to_current_group'
  durationSeconds?: number;
  label: string;
};

type Scenario = {
  id: string;
  name: string;
  actions: ScenarioAction[];
  isActive: boolean; // only one can be active, or we randomly pick from actives
};

declare global {
  interface Window {
    electronAPI?: {
      startAutomation: (config: any) => Promise<{success: boolean, error?: string}>;
      onLog: (callback: (msg: string) => void) => void;
      stopAutomation?: () => void;
    }
  }
}

// --- Mock Automation Engine Logs (For Web Preview) ---
function getMockSteps(keywords: string, autoCommentEnabled: boolean) {
  const steps = [
    `[HỆ THỐNG] Đang chạy bản Web - Cần tải app Desktop để mở Chrome thực tế.`,
    `[HÀNH ĐỘNG] Mở trình duyệt Chrome. (Mô phỏng)`,
    `[HÀNH ĐỘNG] Truy cập www.facebook.com...`,
    `[TRẠNG THÁI] Đã xác nhận trạng thái đăng nhập.`,
    `[HÀNH ĐỘNG] Tìm kiếm từ khóa: "${keywords || 'Bất động sản'}"`,
    `[HÀNH ĐỘNG] Cuộn trang kết quả (mô phỏng thao tác của người)...`,
    `[HÀNH ĐỘNG] Chọn tham gia nhóm: "Mua Bán Nhà Đất Toàn Quốc"`
  ];

  if (autoCommentEnabled) {
    steps.push(
      `[HÀNH ĐỘNG] Quét các bài viết trong nhóm để tìm nhu cầu khách hàng...`,
      `[AI PHÂN TÍCH] Phát hiện một yêu cầu của khách: "Diện tài chính 3.5 tỷ cần mua gấp nhà Tam Bình Thủ Đức, sổ riêng chính chủ..."`,
      `[AI PHÂN TÍCH] Đang đối chiếu với các bđs hiện có trong kho bài viết của bạn...`,
      `[AI PHÂN TÍCH] Tìm thấy bài đăng phù hợp: "Bán nhà Tam Bình giá chỉ 3.2 tỷ hẻm xe hơi, sổ hồng riêng..." (Khớp 95%)`,
      `[HÀNH ĐỘNG] Đang soạn bình luận bám đuôi bằng AI...`,
      `[THÀNH CÔNG] 🎉 Đã bình luận tư vấn: "Chào bạn, mình thấy trong kho nhà có căn Tam Bình 3.2 tỷ hẻm xe hơi rất hợp nhu cầu. Bạn nhắn Zalo 0901234567 mình gửi sổ hồng và tư vấn nhé!"`
    );
  }

  steps.push(
    `[HÀNH ĐỘNG] Lấy ngẫu nhiên bài đăng tư vấn từ thư viện...`,
    `[HÀNH ĐỘNG] Đang soạn nội dung bài viết mới...`,
    `[THÀNH CÔNG] Đã đăng bài viết! Bài viết đang chờ duyệt...`,
    `[HỆ THỐNG] Kịch bản hoàn thành. Đang vào chế độ ngủ.`
  );

  return steps;
}

export default function RealEstateAutoDashboard() {
  const [activeTab, setActiveTab] = useState<'posts' | 'ai' | 'automation' | 'scenarios' | 'autocomment'>('posts');
  
  // App State
  const [posts, setPosts] = useState<Post[]>([]);
  const [keywords, setKeywords] = useState('Bất động sản Hà Nội, Mua bán nhà đất');
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [postsBeforeBreak, setPostsBeforeBreak] = useState(10);
  const [breakMinutes, setBreakMinutes] = useState(60);
  const [scenarios, setScenarios] = useState<Scenario[]>([
    {
      id: 'default',
      name: 'Mặc định (Tìm Group -> Đăng liền)',
      actions: [
        { type: 'search_and_pick_group', label: 'Tìm và chọn Group ngẫu nhiên' },
        { type: 'post_to_current_group', label: 'Đăng bài vào Group' }
      ],
      isActive: true
    }
  ]);
  const [commentTemplates, setCommentTemplates] = useState(
    "Ib Zalo 0901234567, mình có giỏ hàng nhiều sản phẩm đẹp phù hợp nhu cầu.\nNhắn Zalo 0901234567 mình gửi thông tin chi tiết và sổ hồng nhé!\nIb Zalo 0901234567 mình tư vấn tìm căn phù hợp nhất nha."
  );
  const [isMounted, setIsMounted] = useState(false);
  
  // Engine State
  const [isRunning, setIsRunning] = useState(false);
  const [automationMode, setAutomationMode] = useState<'post' | 'comment'>('post');
  const [logs, setLogs] = useState<string[]>([]);
  const [countdown, setCountdown] = useState(0);

  // Load state from local storage on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    const savedPosts = localStorage.getItem('re_posts');
    const savedKey = localStorage.getItem('re_keywords');
    const savedScenarios = localStorage.getItem('re_scenarios');
    const savedCommentTemplates = localStorage.getItem('re_comment_templates');
    if (savedPosts) setPosts(JSON.parse(savedPosts));
    if (savedKey) setKeywords(savedKey);
    if (savedScenarios) setScenarios(JSON.parse(savedScenarios));
    if (savedCommentTemplates) setCommentTemplates(savedCommentTemplates);
  }, []);

  // Save state
  useEffect(() => {
    localStorage.setItem('re_posts', JSON.stringify(posts));
    localStorage.setItem('re_keywords', keywords);
    localStorage.setItem('re_scenarios', JSON.stringify(scenarios));
    localStorage.setItem('re_comment_templates', commentTemplates);
  }, [posts, keywords, scenarios, commentTemplates]);

  const addPost = (content: string, images: string[] = []) => {
    const newPost = { id: Date.now().toString(), content, images, createdAt: Date.now() };
    setPosts([newPost, ...posts]);
  };

  const deletePost = (id: string) => {
    setPosts(posts.filter(p => p.id !== id));
  };

  const editPost = (id: string, content: string, images: string[]) => {
    setPosts(posts.map(p => p.id === id ? { ...p, content, images } : p));
  };

  // Set up Electron IPC listeners if running in Desktop App
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.onLog((msg: string) => {
        setLogs(prev => [...prev, msg]);
      });
    }
  }, []);

  const stepIndexRef = useRef(0);
  const countdownRef = useRef(0);

  // --- Automation Engine Trigger ---
  useEffect(() => {
    let tickInterval: NodeJS.Timeout;
    
    if (isRunning) {
      if (logs.length === 0 || logs[logs.length-1].includes('Trạng thái chờ')) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Bắt đầu chiến dịch tự động đăng bài.`]);
      }
      
      // Nếu chạy trên Electron (App Desktop), gọi Backend Node.js thực thi thật
      if (typeof window !== 'undefined' && window.electronAPI) {
          window.electronAPI.startAutomation({
             mode: automationMode,
             keywords,
             posts,
             intervalMinutes,
             postsBeforeBreak,
             breakMinutes,
             scenarios: scenarios.filter(s => s.isActive),
             commentTemplates
          }).then(res => {
            if (!res.success) {
               setLogs((prev) => [...prev, `[LỖI] ${res.error}`]);
            } else {
               setLogs((prev) => [...prev, `[HỆ THỐNG] Tiến trình bot đã dừng hoàn toàn.`]);
            }
            setIsRunning(false);
         });
      } 
      // Nếu chạy trên Web (AI Studio Preview), chạy giả lập
      else {
        stepIndexRef.current = 0;
        countdownRef.current = 0;
        const steps = getMockSteps(keywords, automationMode === 'comment');
        
        const runCycle = () => {
          if (stepIndexRef.current < steps.length) {
            const msg = steps[stepIndexRef.current];
            setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
            stepIndexRef.current++;
          } else {
            setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Chờ ${intervalMinutes} phút cho chu kỳ tiếp theo...`]);
            countdownRef.current = 15; // khoảng 30s
            stepIndexRef.current = 0;
          }
        };

        tickInterval = setInterval(() => {
          if (countdownRef.current > 0) {
            countdownRef.current -= 1;
          } else {
            runCycle();
          }
        }, 2000);
      }

    } else {
      if (typeof window !== 'undefined' && window.electronAPI) {
         window.electronAPI.stopAutomation?.();
      }
      if (logs.length > 0 && !logs[logs.length-1].includes('Trạng thái chờ') && !logs[logs.length-1].includes('dừng hoàn toàn')) {
         setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [HỆ THỐNG] Đã dừng. Trạng thái chờ khởi động.`]);
      }
    }

    return () => {
      if (tickInterval) clearInterval(tickInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]); // Chỉ phụ thuộc vào isRunning, tránh stale state và vòng lặp vô tận




  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Facebook className="w-8 h-8 text-blue-500" />
            <h1 className="text-xl font-bold">Auto Post FB AI</h1>
          </div>
          <p className="text-xs text-slate-400">Tự động hóa đăng bài Bất Động Sản</p>
          {isMounted && !window.electronAPI && (
            <div className="mt-3 bg-blue-500/20 text-blue-300 text-[10px] px-2 py-1 rounded border border-blue-500/30">
              Chế độ Web Preview (Giả lập)
            </div>
          )}
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

          <button 
            onClick={() => setActiveTab('scenarios')}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'scenarios' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <Settings className="w-5 h-5" />
            <span className="hidden md:inline">Kịch bản tương tác</span>
          </button>

          <button 
            onClick={() => setActiveTab('autocomment')}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'autocomment' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="hidden md:inline">Tự động bình luận</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-100/50">
        <div className="p-4 md:p-8 max-w-6xl mx-auto h-full">
          {activeTab === 'posts' && <PostsView posts={posts} addPost={addPost} deletePost={deletePost} editPost={editPost} />}
          {activeTab === 'ai' && <AIGeneratorView onSave={addPost} />}
          {activeTab === 'automation' && (
            <AutomationView 
              posts={posts}
              keywords={keywords}
              setKeywords={setKeywords}
              intervalMinutes={intervalMinutes}
              setIntervalMinutes={setIntervalMinutes}
              postsBeforeBreak={postsBeforeBreak}
              setPostsBeforeBreak={setPostsBeforeBreak}
              breakMinutes={breakMinutes}
              setBreakMinutes={setBreakMinutes}
              scenarios={scenarios}
              setScenarios={setScenarios}
              isRunning={isRunning}
              setIsRunning={setIsRunning}
              setAutomationMode={setAutomationMode}
              logs={logs}
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === 'scenarios' && (
            <ScenariosView 
              scenarios={scenarios}
              setScenarios={setScenarios}
              isRunning={isRunning}
            />
          )}
          {activeTab === 'autocomment' && (
            <AutoCommentView
              keywords={keywords}
              setKeywords={setKeywords}
              posts={posts}
              commentTemplates={commentTemplates}
              setCommentTemplates={setCommentTemplates}
              isRunning={isRunning}
              setIsRunning={setIsRunning}
              setAutomationMode={setAutomationMode}
              logs={logs}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// --- Sub Views ---

function PostsView({ posts, addPost, deletePost, editPost }: { posts: Post[], addPost: (c: string, i: string[]) => void, deletePost: (id: string) => void, editPost: (id: string, c: string, i: string[]) => void }) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  
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
    if (!content.trim() && images.length === 0) return;
    
    if (editingPostId) {
      editPost(editingPostId, content, images);
      setEditingPostId(null);
    } else {
      addPost(content, images);
    }
    
    setContent('');
    setImages([]);
  };

  const handleEdit = (post: Post) => {
    setContent(post.content);
    setImages(post.images);
    setEditingPostId(post.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleCancelEdit = () => {
    setEditingPostId(null);
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
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
        <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
          {editingPostId ? <Pencil className="w-4 h-4 text-blue-500"/> : <Plus className="w-4 h-4 text-blue-500"/>} 
          {editingPostId ? 'Sửa bài đăng' : 'Tạo bài đăng thủ công'}
        </h3>
        <textarea 
          placeholder="Nội dung bài đăng bán/cho thuê nhà đất..."
          className="w-full h-20 p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none mb-3"
          value={content}
          onChange={e => setContent(e.target.value)}
        />
        
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {images.map((img, idx) => (
               <div key={idx} className="relative w-14 h-14 rounded-lg border border-gray-200 bg-gray-100 overflow-hidden shadow-sm">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img src={img} alt="upload" className="object-cover w-full h-full" />
                 <button onClick={() => setImages(images.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600"><Trash2 className="w-3 h-3"/></button>
               </div>
            ))}
            {images.length < 3 && (
              <label className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-blue-400 transition-colors">
                <ImageIcon className="w-4 h-4 text-gray-400 mb-0.5" />
                <span className="text-[9px] text-gray-500 font-medium">Thêm ảnh</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>

          <div className="flex gap-2">
            {editingPostId && (
              <button onClick={handleCancelEdit} className="bg-gray-200 text-gray-700 px-4 py-2 text-sm rounded-lg font-medium hover:bg-gray-300 transition-colors">
                Hủy
              </button>
            )}
            <button onClick={handleSave} className="bg-slate-900 text-white px-4 py-2 text-sm rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center gap-2">
              {editingPostId ? 'Cập nhật' : 'Lưu bài viết'}
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.length === 0 ? (
            <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-center py-12 bg-white border border-dashed border-gray-300 rounded-xl text-gray-500 flex flex-col items-center">
              <FileText className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm font-medium">Chưa có bài đăng nào.</p>
              <p className="text-xs mt-1">Hãy tạo bài đăng mới ở trên hoặc qua tab AI.</p>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:border-blue-300 transition-colors">
                <div className="p-4 flex-1">
                  <div className="flex items-center justify-between mb-2 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1 font-medium"><Clock className="w-3 h-3"/> {new Date(post.createdAt).toLocaleDateString()}</span>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(post)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-md transition-colors" title="Sửa bài"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deletePost(post.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors" title="Xóa bài"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed line-clamp-6">{post.content}</div>
                </div>
                {post.images.length > 0 && (
                  <div className="h-24 bg-gray-100 flex overflow-hidden border-t border-gray-200">
                     {post.images.map((img, i) => (
                       <div key={i} className="flex-1 border-r border-white last:border-0 relative group">
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                         <img src={img} alt="Post image" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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

function AutomationView({ posts, keywords, setKeywords, intervalMinutes, setIntervalMinutes, postsBeforeBreak, setPostsBeforeBreak, breakMinutes, setBreakMinutes, scenarios, setScenarios, isRunning, setIsRunning, setAutomationMode, logs, setActiveTab }: any) {
  const endLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endLogRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex h-full flex-col lg:flex-row gap-8 pb-8">
      {/* Settings Side */}
      <div className="w-full lg:w-5/12 flex flex-col shrink-0 gap-6 max-w-xl">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <Zap className="w-6 h-6 text-blue-500" />
            Chiến dịch tự động
          </h2>
          <p className="text-slate-500 text-sm mt-1">Thiết lập cấu hình cho tiến trình duyệt và đăng nội dung lên các nhóm.</p>
        </div>

        <div className="space-y-4">
          {/* Card 1: Mục tiêu */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-indigo-500" />
              <h3 className="font-semibold text-slate-800">Mục tiêu & Kịch bản</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Từ khóa Group</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    disabled={isRunning}
                    placeholder="Mua bán nhà đất, Bất động sản..." 
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 disabled:opacity-60 transition-all outline-none text-sm" 
                    value={keywords}
                    onChange={e => setKeywords(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-indigo-900 uppercase tracking-wide">Kịch bản tương tác</span>
                  <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-indigo-100 text-indigo-600 font-bold shadow-sm">{scenarios.filter((s: any) => s.isActive).length} kịch bản</span>
                </div>
                <p className="text-[11px] text-indigo-700/80 leading-relaxed">
                  Trí tuệ nhân tạo sẽ lấy ngẫu nhiên 1 kịch bản để thực thi mỗi chu kỳ, mô phỏng hành vi người thật.
                </p>
                <button 
                  onClick={() => setActiveTab('scenarios')} 
                  className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 w-max"
                >
                  Thiết lập kịch bản →
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Chu kỳ */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Timer className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold text-slate-800">Nhịp độ tự động</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Nghỉ giữa 2 chu kỳ</label>
                <div className="relative">
                  <input 
                    type="number" min="1" disabled={isRunning}
                    className="w-full px-4 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 transition-all outline-none text-sm font-medium"
                    value={intervalMinutes || ''} onChange={e => setIntervalMinutes(Number(e.target.value))}
                  />
                  <span className="absolute right-4 top-2 text-slate-400 text-sm">phút</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide truncate">Sau khi đăng</label>
                  <div className="relative">
                    <input 
                      type="number" min="1" disabled={isRunning}
                      className="w-full px-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 transition-all outline-none text-sm font-medium"
                      value={postsBeforeBreak || ''} onChange={e => setPostsBeforeBreak(Number(e.target.value))}
                    />
                    <span className="absolute right-3 top-2 text-slate-400 text-sm">bài</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide truncate">Nghỉ dài hạn</label>
                  <div className="relative">
                    <input 
                      type="number" min="1" disabled={isRunning}
                      className="w-full px-3 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 transition-all outline-none text-sm font-medium"
                      value={breakMinutes || ''} onChange={e => setBreakMinutes(Number(e.target.value))}
                    />
                    <span className="absolute right-3 top-2 text-slate-400 text-sm">phút</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Start / Stop Section */}
        <div className="pt-2">
          {isRunning ? (
             <button onClick={() => setIsRunning(false)} className="group relative w-full overflow-hidden bg-red-500 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-[0_8px_30px_rgb(239,68,68,0.3)] hover:shadow-[0_8px_30px_rgb(239,68,68,0.5)] active:scale-[0.98]">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] animate-[shimmer_2s_infinite]" />
                <Square className="w-5 h-5 fill-current relative z-10" /> 
                <span className="relative z-10 text-lg">DỪNG TIẾN TRÌNH</span>
             </button>
          ) : (
             <div className="space-y-3">
               <button onClick={() => { setAutomationMode('post'); setIsRunning(true); }} disabled={posts.length === 0 || !keywords.trim()} className="group relative w-full overflow-hidden bg-emerald-500 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-[0_8px_30px_rgb(16,185,129,0.3)] hover:shadow-[0_8px_30px_rgb(16,185,129,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:active:scale-100 disabled:cursor-not-allowed">
                  <Play className="w-5 h-5 fill-current transition-transform group-hover:scale-110" /> 
                  <span className="text-lg">KHỞI CHẠY CHIẾN DỊCH</span>
               </button>
               {posts.length === 0 && (
                 <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-xl text-xs font-medium">
                   <AlertCircle className="w-4 h-4" /> Bạn cần thêm bài viết vào kho để có thể chạy.
                 </div>
               )}
             </div>
          )}
        </div>
      </div>

      {/* Terminal logs side */}
      <div className="w-full lg:flex-1 h-[500px] lg:h-auto bg-[#0a0a0c] rounded-2xl border border-slate-800 flex flex-col shadow-2xl overflow-hidden font-mono shrink-0 lg:shrink ring-1 ring-white/5 relative">
        {/* Terminal Header */}
        <div className="bg-[#121216] border-b border-slate-800/80 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex items-center gap-2 ml-4 px-2 py-1 bg-slate-800/50 rounded-md">
              <Terminal className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-300 text-xs tracking-wider">Terminal</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isRunning ? (
              <span className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                RUNNING
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-800/50 px-2 py-1 rounded-full border border-slate-700">
                <PauseCircle className="w-3.5 h-3.5" />
                IDLE
              </span>
            )}
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-5 overflow-y-auto flex-1 text-[13px] tracking-tight leading-relaxed selection:bg-blue-500/30">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3">
              <History className="w-8 h-8 opacity-20" />
              <p>Chưa có log hệ thống</p>
            </div>
          ) : (
            logs.map((log: string, idx: number) => {
               const isWarning = log.includes('Chờ') || log.includes('ngủ') || log.includes('LỖI');
               const isSuccess = log.includes('THÀNH CÔNG');
               const isAction = log.includes('HÀNH ĐỘNG');
               const isSystem = log.includes('HỆ THỐNG');
               
               let colorClass = 'text-slate-400';
               if (isWarning) colorClass = 'text-amber-400/90';
               if (isSuccess) colorClass = 'text-emerald-400';
               if (isAction) colorClass = 'text-cyan-400/90';
               if (isSystem) colorClass = 'text-indigo-400/90';

               return (
                <div key={idx} className={`mb-2 font-medium flex gap-3 hover:bg-white/5 px-2 py-1 -mx-2 rounded transition-colors ${colorClass}`}>
                  <span className="text-slate-600 shrink-0 select-none opacity-50">{new Date().toLocaleTimeString('en-US', { hour12: false })}</span>
                  <span>{log}</span>
                </div>
              );
            })
          )}
          <div ref={endLogRef} className="h-4" />
        </div>
      </div>
    </div>
  );
}

function AutoCommentView({ keywords, setKeywords, posts, commentTemplates, setCommentTemplates, isRunning, setIsRunning, setAutomationMode, logs }: any) {
  const endLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endLogRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex h-full flex-col lg:flex-row gap-8 pb-8">
      {/* Settings side */}
      <div className="flex-1 space-y-6 shrink-0 lg:shrink max-w-xl">
        <div className="bg-white p-6 rounded-xl border border-gray-200/60 shadow-sm space-y-5 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-full pointer-events-none" />
          
          <h2 className="text-xl font-bold flex items-center gap-2 relative text-slate-800">
            <MessageSquare className="w-5 h-5 text-blue-500" /> Cài đặt bình luận AI
          </h2>

          <div className="space-y-3 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 text-left">
            <p className="text-[13px] text-indigo-950 leading-relaxed font-medium">
              💡 <strong>Cách thức hoạt động:</strong> AI quét các bài dạo trong Group theo từ khóa, lọc ra bài tìm kiếm bđs của khách (Ví dụ: &quot;Cần tìm đất dưới 4 tỷ...&quot;), tự động đối chiếu các bài đăng trong kho của bạn để tìm căn phù hợp nhất, ghép lời tư vấn bám đuổi &amp; đính kèm mẫu Zalo/SĐT.
            </p>
          </div>

          <div>
             <label className="block text-sm font-semibold text-gray-800 mb-1.5 flex items-center gap-1.5">
               Từ khóa Group (Nhóm) quét bài <span className="text-red-500">*</span>
             </label>
             <p className="text-xs text-slate-500 mb-2">Bot sẽ tìm nhóm FB dựa trên từ khóa này để đọc bài khách đăng.</p>
             <input 
                type="text" 
                disabled={isRunning}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-gray-50"
                placeholder="VD: Mua bán nhà đất Hà Nội"
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
             />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5 mt-4">Danh sách mẫu SĐT liên hệ (mỗi dòng 1 mẫu):</label>
            <p className="text-xs text-slate-500 mb-2">Sẽ được đính vào cuối bình luận tư vấn của AI.</p>
            <textarea 
              disabled={isRunning}
              rows={5}
              placeholder="Mẫu 1: Ib zalo 090xxxxx, mình có căn này rất khớp nhu cầu của bạn.&#10;Mẫu 2: Nhắn zalo 090xxxxx mình gửi sđt và sổ hồng xem nhé.&#10;..."
              className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-800 font-mono leading-relaxed resize-none shadow-inner"
              value={commentTemplates}
              onChange={e => setCommentTemplates(e.target.value)}
            />
            <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
              <span>🤖 Tránh bị spam FB bằng cách thêm nhiều mẫu khác nhau.</span>
              <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">Số mẫu: {commentTemplates.split('\n').filter((t: string) => t.trim()).length}</span>
            </div>
          </div>
        </div>

        {/* Action button */}
        {isRunning ? (
           <button onClick={() => setIsRunning(false)} className="w-full bg-red-500 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-lg shadow-red-500/30 shrink-0">
              <Square className="w-6 h-6 fill-current" /> DỪNG TIẾN TRÌNH
           </button>
        ) : (
           <button onClick={() => { setAutomationMode('comment'); setIsRunning(true); }} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed shrink-0" disabled={posts.length === 0 || !keywords.trim() || !commentTemplates.trim()}>
             <Play className="w-6 h-6 fill-current" /> BẮT ĐẦU CHẠY BÌNH LUẬN AI
           </button>
        )}
        {!isRunning && posts.length === 0 && <p className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded-lg">Cần thêm bài viết vào kho để AI có dữ liệu so khớp nhà.</p>}
      </div>

      {/* Terminal logs side */}
      <div className="w-full lg:flex-1 h-96 lg:h-auto bg-[#0a0a0a] rounded-xl border border-gray-800 flex flex-col shadow-2xl overflow-hidden font-mono shrink-0 lg:shrink">
        <div className="bg-[#1a1a1a] border-b border-gray-800 px-4 py-3 flex items-center gap-2 shrink-0">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-gray-400 text-xs ml-2 font-medium tracking-wide">auto_comment.exe</span>
          <div className="ml-auto text-[10px] text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20">LIVE SERVER</div>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto space-y-1">
          {logs.length === 0 ? (
            <div className="text-gray-500 text-sm flex items-center justify-center h-full gap-2">
               <span className="animate-pulse">Chưa có tiến trình đang chạy...</span>
            </div>
          ) : (
            logs.map((log: string, i: number) => (
              <div key={i} className={`text-[13px] leading-relaxed break-words font-medium ${
                 log.includes('[LỖI]') ? 'text-red-400' : 
                 log.includes('[THÀNH CÔNG]') ? 'text-emerald-400' :
                 log.includes('[HÀNH ĐỘNG]') ? 'text-blue-300' :
                 log.includes('[AI') ? 'text-purple-400' :
                 'text-slate-300'
              }`}>
                {log}
              </div>
            ))
          )}
          <div ref={endLogRef} className="h-4" />
        </div>
      </div>
    </div>
  );
}

function ScenariosView({ scenarios, setScenarios, isRunning }: { scenarios: Scenario[], setScenarios: (s: Scenario[]) => void, isRunning: boolean }) {
  const [scenarioPrompt, setScenarioPrompt] = useState("");
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);

  const handleGenerateScenario = async (customPrompt?: string) => {
    const promptToSend = customPrompt || scenarioPrompt;
    if (!promptToSend.trim() && !customPrompt) {
      alert("Vui lòng nhập ý tưởng kịch bản hoặc chọn 'Tự động đề xuất'!");
      return;
    }
    
    setIsGeneratingScenario(true);
    try {
      const res = await fetch('/api/gemini/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: promptToSend,
          isRandom: !promptToSend 
        })
      });
      const data = await res.json();
      if (data.actions && Array.isArray(data.actions)) {
        const newScenario = {
          id: Date.now().toString(),
          name: data.name || ('Kịch bản AI ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })),
          actions: data.actions,
          isActive: true
        };
        setScenarios([newScenario, ...scenarios]);
        if (!customPrompt) setScenarioPrompt("");
        alert(`Đã tạo kịch bản "${newScenario.name}" bằng AI thành công!`);
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến server.');
    } finally {
      setIsGeneratingScenario(false);
    }
  };

  const toggleScenario = (id: string) => {
    setScenarios(scenarios.map((s: any) => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  const deleteScenario = (id: string) => {
    setScenarios(scenarios.filter((s: any) => s.id !== id));
  };

  const PRESETS = [
    "Nuôi tài khoản: Lướt News feed 2 phút, like dạo rồi mới tìm group đăng bài",
    "Gia tăng tương tác chéo: Vào group, lướt dạo xem tin tức 1 phút rồi mới đăng",
    "Thả lỏng thông minh: Đi dạo trang chủ 30 giây, lướt trong nhóm 1 phút rồi mới đăng bài để tránh robot"
  ];

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600" /> Kịch bản tương tác tự động
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Tạo và kích hoạt các kịch bản tương tác khác nhau của bot. Khi chiến dịch tự động bắt đầu, bot sẽ <strong>bốc ngẫu nhiên (random)</strong> một trong những kịch bản đang được kích hoạt để tăng độ tương tác đa dạng, tránh bị hệ thống Facebook nhận dạng spam.
        </p>
      </div>

      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-5 rounded-xl border border-indigo-100 mb-6 col-span-2">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-sm font-bold text-indigo-900">🪄 Thiết kế kịch bản thông minh bằng AI</label>
          <button
            type="button"
            disabled={isRunning || isGeneratingScenario}
            onClick={() => handleGenerateScenario("")}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" /> AI tự tạo kịch bản ngẫu nhiên hợp lý
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <input 
             type="text"
             disabled={isRunning || isGeneratingScenario}
             placeholder="Hoặc tự mô tả: VD lướt FB 2 phút, like dạo, sau đó tìm group đăng bài..."
             className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
             value={scenarioPrompt}
             onChange={e => setScenarioPrompt(e.target.value)}
          />
          <button 
             disabled={isRunning || isGeneratingScenario || !scenarioPrompt.trim()}
             onClick={() => handleGenerateScenario()}
             className="px-6 py-3 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 transition-colors text-sm"
          >
            {isGeneratingScenario ? 'Đang tạo bằng AI...' : 'Tạo theo ý bạn'}
          </button>
        </div>

        <div className="mt-4">
          <span className="text-xs font-semibold text-slate-500 block mb-1.5">Hoặc bấm chọn nhanh gợi ý:</span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset, i) => (
              <button
                key={i}
                type="button"
                disabled={isRunning || isGeneratingScenario}
                onClick={() => {
                  setScenarioPrompt(preset);
                }}
                className="text-xs bg-white text-slate-700 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all text-left max-w-full truncate"
              >
                💡 {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarios.map((s: any) => (
          <div 
            key={s.id} 
            className={`p-4 rounded-xl border transition-all flex flex-col justify-between min-h-[140px] bg-white ${s.isActive ? 'border-blue-500 ring-1 ring-blue-500 shadow-sm' : 'border-gray-200 shadow-sm hover:border-gray-300'}`}
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-gray-900 text-base">{s.name}</span>
                <div className="flex items-center gap-2">
                  {!isRunning && s.id !== 'default' && (
                    <button 
                      onClick={() => deleteScenario(s.id)}
                      className="text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa kịch bản"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <input
                    type="checkbox"
                    disabled={isRunning}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                    checked={s.isActive}
                    onChange={() => toggleScenario(s.id)}
                  />
                </div>
              </div>
              
              <div className="text-xs mb-3 font-medium">
                {s.isActive ? (
                  <span className="text-green-600 font-semibold">🟢 Kích hoạt (Sẵn sàng chọn ngẫu nhiên)</span>
                ) : (
                  <span className="text-gray-400">⚪️ Đang tắt</span>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Các bước thực thi:</div>
                <ul className="list-decimal list-inside text-xs text-slate-700 space-y-1">
                  {s.actions.map((act: any, idx: number) => (
                    <li key={idx} className="line-clamp-1">
                      <span className="font-medium text-slate-800">{act.label || act.type}</span>
                      {act.durationSeconds ? <span className="text-gray-400 text-[10px] ml-1">({act.durationSeconds} giây)</span> : ''}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
