"use client";

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  User, 
  Utensils, 
  MessageSquare, 
  ChevronRight, 
  TrendingUp, 
  RefreshCw,
  BrainCircuit,
  Leaf,
  Send,
  Scale
} from 'lucide-react';

// --- CONFIGURACIÓN IA ---
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// --- TIPOS ---
interface UserProfile {
  name: string;
  age: number;
  weight: number;
  height: number;
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
  goal: 'lose_weight' | 'maintain' | 'gain_muscle';
  dietType: 'omnivore' | 'vegetarian' | 'vegan' | 'keto';
}

interface UserMetrics {
  bmi: number;
  bmiCategory: string;
  targetCalories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface Meal {
  name: string;
  description: string;
  calories: number;
  ingredients: string[];
}

interface DailyPlan {
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snack: Meal;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// --- UTILS ---
const calculateMetrics = (profile: UserProfile): UserMetrics => {
  const heightM = profile.height / 100;
  const bmi = parseFloat((profile.weight / (heightM * heightM)).toFixed(1));
  let bmiCategory = 'Normal';
  if (bmi < 18.5) bmiCategory = 'Bajo Peso';
  else if (bmi >= 25 && bmi < 29.9) bmiCategory = 'Sobrepeso';
  else if (bmi >= 30) bmiCategory = 'Obesidad';

  let bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age;
  bmr += profile.gender === 'male' ? 5 : -161;

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    athlete: 1.9
  };
  const tdee = Math.round(bmr * activityMultipliers[profile.activityLevel]);

  let targetCalories = tdee;
  if (profile.goal === 'lose_weight') targetCalories -= 400;
  if (profile.goal === 'gain_muscle') targetCalories += 300;

  const protein = Math.round((targetCalories * 0.3) / 4);
  const fats = Math.round((targetCalories * 0.3) / 9);
  const carbs = Math.round((targetCalories * 0.4) / 4);

  return { bmi, bmiCategory, targetCalories, protein, carbs, fats };
};

// --- COMPONENTES ---

const LoadingScreen = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center justify-center p-10 space-y-4 animate-in fade-in">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
      <div className="absolute inset-0 border-4 border-t-emerald-500 rounded-full animate-spin"></div>
    </div>
    <p className="text-emerald-500 font-medium animate-pulse text-center">{text}</p>
  </div>
);

const Onboarding = ({ onComplete }: { onComplete: (p: UserProfile) => void }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<any>({
    name: '', age: '', weight: '', height: '', gender: 'male',
    activityLevel: 'moderate', goal: 'maintain', dietType: 'omnivore'
  });

  const next = () => {
    if (step < 4) setStep(s => s + 1);
    else {
      onComplete({
        ...data,
        age: Number(data.age) || 30,
        weight: Number(data.weight) || 75,
        height: Number(data.height) || 170
      });
    }
  };
  
  const update = (k: string, v: any) => setData((p: any) => ({...p, [k]: v}));

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <BrainCircuit size={48} className="text-emerald-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold">NutriGenius AI</h1>
          <p className="text-zinc-500">Chile Edition</p>
        </div>

        <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Datos Básicos</h2>
              <input type="text" placeholder="Tu Nombre" className="w-full bg-zinc-800 border border-zinc-700 p-4 rounded-xl outline-none focus:border-emerald-500" value={data.name} onChange={e => update('name', e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Edad" className="bg-zinc-800 border border-zinc-700 p-4 rounded-xl outline-none focus:border-emerald-500" value={data.age} onChange={e => update('age', e.target.value)} />
                <select className="bg-zinc-800 border border-zinc-700 p-4 rounded-xl outline-none" value={data.gender} onChange={e => update('gender', e.target.value)}>
                  <option value="male">Hombre</option>
                  <option value="female">Mujer</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Medidas</h2>
              <input type="number" placeholder="Peso (kg)" className="w-full bg-zinc-800 border border-zinc-700 p-4 rounded-xl text-center text-2xl font-bold" value={data.weight} onChange={e => update('weight', e.target.value)} />
              <input type="number" placeholder="Altura (cm)" className="w-full bg-zinc-800 border border-zinc-700 p-4 rounded-xl text-center text-2xl font-bold" value={data.height} onChange={e => update('height', e.target.value)} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2">
              <h2 className="text-xl font-semibold mb-4">Actividad</h2>
              {['sedentary', 'light', 'moderate', 'active'].map((level) => (
                <button key={level} onClick={() => update('activityLevel', level)} className={`w-full p-4 rounded-xl border ${data.activityLevel === level ? 'bg-emerald-500/20 border-emerald-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                  {level.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Objetivo</h2>
              <select className="w-full bg-zinc-800 border border-zinc-700 p-4 rounded-xl" value={data.goal} onChange={e => update('goal', e.target.value)}>
                <option value="lose_weight">Perder Grasa</option>
                <option value="maintain">Mantener</option>
                <option value="gain_muscle">Ganar Músculo</option>
              </select>
              <select className="w-full bg-zinc-800 border border-zinc-700 p-4 rounded-xl" value={data.dietType} onChange={e => update('dietType', e.target.value)}>
                <option value="omnivore">Omnívoro</option>
                <option value="vegetarian">Vegetariano</option>
                <option value="vegan">Vegano</option>
              </select>
            </div>
          )}

          <button onClick={next} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2">
            {step === 4 ? 'Empezar' : 'Siguiente'} <ChevronRight size={20}/>
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'coach'>('plan');
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  const generateDiet = async (p: UserProfile, m: UserMetrics) => {
    setLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Genera un plan de 1 día para ${p.name} (Objetivo: ${p.goal}, Dieta: ${p.dietType}). Calorías: ${m.targetCalories}. Usa ingredientes baratos de Chile (feria/Lider). Devuelve SOLO JSON: {"breakfast":{"name":"","description":"","calories":0,"ingredients":[]},"lunch":{...},"dinner":{...},"snack":{...}}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(text);
      setPlan(data);
      localStorage.setItem('nutri_plan', JSON.stringify(data));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onProfileComplete = (p: UserProfile) => {
    const m = calculateMetrics(p);
    setProfile(p);
    setMetrics(m);
    localStorage.setItem('nutri_profile', JSON.stringify(p));
    generateDiet(p, m);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(`Eres un nutricionista chileno. Ayuda a ${profile?.name}. Pregunta: ${input}`);
      setMessages(prev => [...prev, { role: 'model', text: result.response.text() }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Error de conexión." }]);
    }
  };

  if (!profile) return <Onboarding onComplete={onProfileComplete} />;

  return (
    <div className="flex justify-center min-h-screen bg-black text-white">
      <div className="w-full max-w-md bg-zinc-950 flex flex-col h-screen border-x border-zinc-800">
        <header className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h1 className="font-bold flex items-center gap-2 text-emerald-500"><Leaf size={20}/> NutriGenius</h1>
          <div className="text-xs bg-zinc-800 px-3 py-1 rounded-full">{metrics?.targetCalories} kcal</div>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          {activeTab === 'plan' ? (
            <div className="space-y-6">
              <div className="bg-emerald-500/10 p-6 rounded-3xl border border-emerald-500/20">
                <p className="text-sm text-emerald-500 font-bold uppercase">Estado Nutricional</p>
                <h2 className="text-3xl font-bold mt-1">{metrics?.bmi} BMI</h2>
                <p className="text-zinc-400">{metrics?.bmiCategory}</p>
              </div>

              {loading ? <LoadingScreen text="Cocinando tu plan..." /> : plan && (
                <div className="space-y-4">
                  {Object.entries(plan).map(([key, meal]: [string, any]) => (
                    <div key={key} className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800">
                      <p className="text-xs font-bold text-emerald-500 uppercase">{key}</p>
                      <h3 className="text-xl font-bold mt-1">{meal.name}</h3>
                      <p className="text-sm text-zinc-500 mt-1">{meal.description}</p>
                      <div className="mt-3 flex gap-2 overflow-x-auto">
                        {meal.ingredients.map((ing: string, i: number) => (
                          <span key={i} className="text-[10px] bg-zinc-800 px-2 py-1 rounded-md whitespace-nowrap">{ing}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex-1 space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={`p-4 rounded-2xl max-w-[80%] ${m.role === 'user' ? 'ml-auto bg-emerald-500 text-black' : 'bg-zinc-800 text-white'}`}>
                    {m.text}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <input value={input} onChange={e => setInput(e.target.value)} placeholder="Pregunta algo..." className="flex-1 bg-zinc-800 p-4 rounded-xl outline-none" />
                <button onClick={handleSend} className="bg-emerald-500 p-4 rounded-xl text-black"><Send size={20}/></button>
              </div>
            </div>
          )}
        </main>

        <nav className="p-4 border-t border-zinc-800 flex justify-around">
          <button onClick={() => setActiveTab('plan')} className={`p-2 ${activeTab === 'plan' ? 'text-emerald-500' : 'text-zinc-500'}`}><Utensils/></button>
          <button onClick={() => setActiveTab('coach')} className={`p-2 ${activeTab === 'coach' ? 'text-emerald-500' : 'text-zinc-500'}`}><MessageSquare/></button>
        </nav>
      </div>
    </div>
  );
}
