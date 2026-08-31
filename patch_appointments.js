import fs from 'fs';
let code = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');

// 1. Add Mic, Square, AudioLines imports
code = code.replace(/Star,/, 'Star,\n  Mic,\n  Square,\n  AudioLines,');

// 2. Add state
code = code.replace(/const \[tcInformacionPersonalizada, setTcInformacionPersonalizada\] = useState\(""\);\n  const \[tcArchivosNecesarios, setTcArchivosNecesarios\] = useState<\{name: string, url: string\}\[\]>\(\[\]\);/, 
`const [tcInformacionPersonalizada, setTcInformacionPersonalizada] = useState("");
  const [tcArchivosNecesarios, setTcArchivosNecesarios] = useState<{name: string, url: string}[]>([]);
  const [tcTranscripcionAutomatica, setTcTranscripcionAutomatica] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const fileName = \`Audio_\${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.webm\`;
          setTcArchivosNecesarios(prev => [...prev, { name: fileName, url: base64data }]);
        };
        reader.readAsDataURL(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'es-ES';

        recognition.onresult = (event: any) => {
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            }
          }
          if (final) {
             setTcTranscripcionAutomatica(prev => {
                const current = prev ? prev.trim() + ' ' : '';
                return current + final.trim();
             });
          }
        };
        recognition.start();
      }

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  };`);

// 3. Reset state
code = code.replace(/setTcInformacionPersonalizada\(""\);\n    setTcArchivosNecesarios\(\[\]\);/g, 
`setTcInformacionPersonalizada("");
    setTcArchivosNecesarios([]);
    setTcTranscripcionAutomatica("");`);

// 4. Populate state when editing
code = code.replace(/setTcInformacionPersonalizada\(tc\.informacionPersonalizada \|\| ""\);\n    setTcArchivosNecesarios\(tc\.archivosNecesarios \|\| \[\]\);/, 
`setTcInformacionPersonalizada(tc.informacionPersonalizada || "");
    setTcArchivosNecesarios(tc.archivosNecesarios || []);
    setTcTranscripcionAutomatica(tc.transcripcionAutomatica || "");`);

// 5. Save state when saving
code = code.replace(/informacionPersonalizada: tcInformacionPersonalizada \|\| undefined,\n                archivosNecesarios: tcArchivosNecesarios.length > 0 \? tcArchivosNecesarios : undefined,/g, 
`informacionPersonalizada: tcInformacionPersonalizada || undefined,
                archivosNecesarios: tcArchivosNecesarios.length > 0 ? tcArchivosNecesarios : undefined,
                transcripcionAutomatica: tcTranscripcionAutomatica || undefined,`);
code = code.replace(/informacionPersonalizada: tcInformacionPersonalizada \|\| undefined,\n        archivosNecesarios: tcArchivosNecesarios.length > 0 \? tcArchivosNecesarios : undefined,/g, 
`informacionPersonalizada: tcInformacionPersonalizada || undefined,
        archivosNecesarios: tcArchivosNecesarios.length > 0 ? tcArchivosNecesarios : undefined,
        transcripcionAutomatica: tcTranscripcionAutomatica || undefined,`);

fs.writeFileSync('src/components/AppointmentsView.tsx', code);
