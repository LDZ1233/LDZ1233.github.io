import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Upload, Volume2 } from 'lucide-react';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Two separate analysers for vocals and instruments
  const vocalsAnalyserRef = useRef<AnalyserNode | null>(null);
  const instrAnalyserRef = useRef<AnalyserNode | null>(null);
  
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [hasAudio, setHasAudio] = useState(false);
  const [fileName, setFileName] = useState('');

  // Initialize audio context with dual filter setup
  const initAudioContext = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;

    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    // Create analysers for vocals and instruments
    const vocalsAnalyser = audioContext.createAnalyser();
    const instrAnalyser = audioContext.createAnalyser();
    
    vocalsAnalyser.fftSize = 256;
    vocalsAnalyser.smoothingTimeConstant = 0.85;
    
    instrAnalyser.fftSize = 256;
    instrAnalyser.smoothingTimeConstant = 0.85;

    try {
      const source = audioContext.createMediaElementSource(audioRef.current);
      
      // Create filters for frequency separation
      // Highpass for vocals (above 2kHz)
      const highpassFilter = audioContext.createBiquadFilter();
      highpassFilter.type = 'highpass';
      highpassFilter.frequency.value = 2000;
      highpassFilter.Q.value = 0.7;
      
      // Lowpass for instruments (below 2kHz)
      const lowpassFilter = audioContext.createBiquadFilter();
      lowpassFilter.type = 'lowpass';
      lowpassFilter.frequency.value = 2000;
      lowpassFilter.Q.value = 0.7;
      
      // Connect source to both filters
      source.connect(highpassFilter);
      source.connect(lowpassFilter);
      
      // Connect filters to their respective analysers
      highpassFilter.connect(vocalsAnalyser);
      lowpassFilter.connect(instrAnalyser);
      
      // Connect source directly to destination for full audio output
      source.connect(audioContext.destination);
      
      audioContextRef.current = audioContext;
      vocalsAnalyserRef.current = vocalsAnalyser;
      instrAnalyserRef.current = instrAnalyser;
      sourceRef.current = source;
    } catch (e) {
      console.error('Audio context init failed:', e);
    }
  }, []);

  // Draw dual spectrum visualization
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const vocalsAnalyser = vocalsAnalyserRef.current;
    const instrAnalyser = instrAnalyserRef.current;
    
    if (!canvas || !vocalsAnalyser || !instrAnalyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = vocalsAnalyser.frequencyBinCount;
    const vocalsData = new Uint8Array(bufferLength);
    const instrData = new Uint8Array(bufferLength);
    
    vocalsAnalyser.getByteFrequencyData(vocalsData);
    instrAnalyser.getByteFrequencyData(instrData);

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerY = canvas.height / 2;
    const sliceWidth = canvas.width / (bufferLength - 1);

    // === Draw INSTRUMENTS (Low frequencies) - BOTTOM HALF ===
    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let x = 0;
    ctx.moveTo(0, centerY);

    for (let i = 0; i < bufferLength; i++) {
      const v = instrData[i] / 255;
      // Invert: higher amplitude = lower on canvas (extends downward from center)
      const y = centerY + (v * centerY * 0.9);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }

    ctx.stroke();

    // === Draw VOCALS (High frequencies) - TOP HALF ===
    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    x = 0;
    ctx.moveTo(0, centerY);

    for (let i = 0; i < bufferLength; i++) {
      const v = vocalsData[i] / 255;
      // Higher amplitude = higher on canvas (extends upward from center)
      const y = centerY - (v * centerY * 0.9);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }

    ctx.stroke();

    // === Draw Center Divider Line ===
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();

    // === Draw subtle glow effect for vocals ===
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 0.5;
    
    x = 0;
    ctx.moveTo(0, centerY);

    for (let i = 0; i < bufferLength; i++) {
      const v = (vocalsData[i] / 255) * 0.7;
      const y = centerY - (v * centerY * 0.9);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }

    ctx.stroke();

    animationRef.current = requestAnimationFrame(draw);
  }, []);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !audioRef.current) return;

    const url = URL.createObjectURL(file);
    audioRef.current.src = url;
    setFileName(file.name);
    setHasAudio(true);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Toggle play/pause
  const togglePlay = async () => {
    if (!audioRef.current || !hasAudio) return;

    if (!audioContextRef.current) {
      initAudioContext();
    }

    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
      cancelAnimationFrame(animationRef.current);
    } else {
      audioRef.current.play();
      draw();
    }
    setIsPlaying(!isPlaying);
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Handle loaded metadata
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Handle ended
  const handleEnded = () => {
    setIsPlaying(false);
    cancelAnimationFrame(animationRef.current);
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Handle seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Format time
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Set canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      {/* Main Container */}
      <div className="w-full max-w-3xl">
        
        {/* Title */}
        <h1 className="text-white text-2xl font-light tracking-widest text-center mb-8 opacity-80">
          SPECTRUM
        </h1>

        {/* Spectrum Labels */}
        <div className="flex justify-between px-2 mb-2">
          <span className="text-white/40 text-xs tracking-wider">VOCALS</span>
          <span className="text-white/40 text-xs tracking-wider">INSTRUMENTS</span>
        </div>

        {/* Spectrum Canvas */}
        <div className="relative w-full h-80 mb-10 border border-white/10 rounded-sm overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ imageRendering: 'crisp-edges' }}
          />
          {!hasAudio && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white/30 text-sm tracking-wider">
                上传音乐以开始
              </span>
            </div>
          )}
        </div>

        {/* File Info */}
        {fileName && (
          <div className="text-center mb-8">
            <span className="text-white/60 text-sm truncate max-w-md inline-block">
              {fileName}
            </span>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col items-center gap-6">
          
          {/* Progress Bar */}
          <div className="w-full flex items-center gap-4">
            <span className="text-white/50 text-xs w-12 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              disabled={!hasAudio}
              className="flex-1 h-0.5 bg-white/20 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
            />
            <span className="text-white/50 text-xs w-12">
              {formatTime(duration)}
            </span>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-8">
            {/* Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              title="上传音乐"
            >
              <Upload size={20} />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              disabled={!hasAudio}
              className="w-16 h-16 flex items-center justify-center border border-white/40 rounded-full text-white hover:border-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <Volume2 size={16} className="text-white/60" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-0.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          crossOrigin="anonymous"
        />

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Footer */}
      <div className="fixed bottom-6 text-white/20 text-xs tracking-wider">
        DUAL BAND VISUALIZER
      </div>
    </div>
  );
}

export default App;
