// app/cadastro/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CadastroPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  
  // Dados da Barbearia
  const [barbershopName, setBarbershopName] = useState('');
  const [document, setDocument] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  
  // Dados do Usuário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRequestCode = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      // Validações de preenchimento
      if (!barbershopName || !document || !address || !phone || !name || !email || !confirmEmail || !password || !confirmPassword) {
          setError('Por favor, preencha todos os campos.');
          return;
      }

      if (email !== confirmEmail) {
          setError('Os e-mails não conferem.');
          return;
      }

      if (password !== confirmPassword) {
          setError('As senhas não conferem.');
          return;
      }

      try {
          const res = await fetch('/api/auth/send-code', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  barbershopName,
                  document,
                  address,
                  phone,
                  name,
                  email,
                  password
              })
          });

          if (res.ok) {
              setStep(2);
              setSuccess('Código enviado para o seu e-mail!');
              setError('');
          } else {
              const data = await res.json();
              setError(data.message || 'Erro ao enviar o código.');
          }
      } catch (err) {
          setError('Erro de conexão com o servidor.');
      }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setSuccess('');

      if (!code) {
          setError('Por favor, digite o código.');
          return;
      }

      try {
          const res = await fetch('/api/auth/verify', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  email: email,
                  code: code
              })
          });

          if (res.ok) {
              setSuccess('Cadastro realizado com sucesso! Redirecionando para o login...');
              setTimeout(() => {
                  router.push('/login');
              }, 2000);
          } else {
              const data = await res.json();
              setError(data.message || 'Código inválido ou expirado.');
          }
      } catch (err) {
          setError('Erro de conexão com o servidor.');
      }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                    Cadastro da Barbearia
                </h1>
                <p className="text-zinc-400">
                    Crie o ambiente de gestão para o seu negócio
                </p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-6 text-center">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-500/10 border border-green-500 text-green-500 p-3 rounded mb-6 text-center">
                    {success}
                </div>
            )}

            {step === 1 ? (
                <form onSubmit={handleRequestCode} className="space-y-6">
                    
                    <h2 className="text-[#FFD700] font-bold border-b border-zinc-800 pb-2 mb-4 mt-6">1. Dados do Estabelecimento</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Nome da Barbearia</label>
                            <input
                                type="text"
                                value={barbershopName}
                                onChange={(e) => setBarbershopName(e.target.value)}
                                className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-3 focus:outline-none focus:border-[#FFD700] transition-colors"
                                placeholder="Nome fantasia"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">CNPJ ou CPF</label>
                            <input
                                type="text"
                                value={document}
                                onChange={(e) => setDocument(e.target.value)}
                                className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-3 focus:outline-none focus:border-[#FFD700] transition-colors"
                                placeholder="00.000.000/0000-00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Telefone (WhatsApp)</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-3 focus:outline-none focus:border-[#FFD700] transition-colors"
                                placeholder="(00) 00000-0000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Endereço Completo</label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-3 focus:outline-none focus:border-[#FFD700] transition-colors"
                                placeholder="Rua, Número, Bairro, Cidade"
                            />
                        </div>
                    </div>

                    <h2 className="text-[#FFD700] font-bold border-b border-zinc-800 pb-2 mb-4 mt-8">2. Dados do Administrador</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-white mb-2">Nome Completo (Responsável)</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-3 focus:outline-none focus:border-[#FFD700] transition-colors"
                                placeholder="Seu nome"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">E-mail</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-3 focus:outline-none focus:border-[#FFD700] transition-colors"
                                placeholder="seu@email.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Confirmar E-mail</label>
                            <input
                                type="email"
                                value={confirmEmail}
                                onChange={(e) => setConfirmEmail(e.target.value)}
                                className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-3 focus:outline-none focus:border-[#FFD700] transition-colors"
                                placeholder="Confirme seu e-mail"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-3 focus:outline-none focus:border-[#FFD700] transition-colors"
                                placeholder="Crie uma senha segura"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Confirmar Senha</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-black border border-zinc-800 text-white rounded px-4 py-3 focus:outline-none focus:border-[#FFD700] transition-colors"
                                placeholder="Confirme sua senha"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-[#FFD700] text-black font-bold rounded px-4 py-4 mt-6 hover:bg-yellow-500 transition-colors text-lg"
                    >
                        Receber Código por E-mail
                    </button>
                </form>
            ) : (
                <form onSubmit={handleVerifyCode} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-white mb-2 text-center">
                            Código de Verificação
                        </label>
                        <p className="text-zinc-400 text-sm mb-6 text-center">
                            Verifique a caixa de entrada do e-mail <strong className="text-[#FFD700]">{email}</strong>
                        </p>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full max-w-xs mx-auto block bg-black border border-zinc-800 text-white rounded px-4 py-4 focus:outline-none focus:border-[#FFD700] transition-colors text-center text-3xl tracking-[0.5em]"
                            placeholder="000000"
                            maxLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-[#FFD700] text-black font-bold rounded px-4 py-4 hover:bg-yellow-500 transition-colors text-lg"
                    >
                        Verificar e Concluir Cadastro
                    </button>
                    
                    <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="w-full bg-transparent border border-zinc-700 text-white font-bold rounded px-4 py-3 hover:bg-zinc-800 transition-colors mt-4"
                    >
                        Voltar para a Edição
                    </button>
                </form>
            )}

            <div className="mt-8 text-center border-t border-zinc-800 pt-6">
                <p className="text-zinc-400">
                    Já tem sua barbearia cadastrada?{' '}
                    <button
                        onClick={() => router.push('/login')}
                        className="text-[#FFD700] hover:underline"
                    >
                        Faça login
                    </button>
                </p>
            </div>
        </div>
    </div>
  );
}