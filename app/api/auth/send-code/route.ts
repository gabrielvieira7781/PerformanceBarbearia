// app/api/auth/send-code/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    console.log("LENDO O BANCO:", process.env.DATABASE_URL);
    try {
        const body = await request.json();
        const { barbershopName, document, address, phone, name, email, password } = body;

        // Verifica se o usuário já existe no banco de dados
        const existingUser = await prisma.user.findUnique({
            where: { email: email }
        });

        if (existingUser && existingUser.isVerified) {
            return NextResponse.json(
                { message: 'Este e-mail já está em uso e verificado.' },
                { status: 400 }
            );
        }

        // Gera um código de 6 dígitos aleatório
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Define o tempo de expiração do código (15 minutos)
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        // Criptografa a senha
        const hashedPassword = await bcrypt.hash(password, 10);

        if (existingUser && !existingUser.isVerified) {
            // Se o usuário não verificou o e-mail na tentativa anterior, atualiza os dados
            await prisma.user.update({
                where: { email: email },
                data: {
                    name: name,
                    password: hashedPassword,
                    verificationCode: verificationCode,
                    verificationCodeExpires: expiresAt
                }
            });

            // Atualiza também os dados da barbearia atrelada, se existir
            if (existingUser.barbershopId) {
                await prisma.barbershop.update({
                    where: { id: existingUser.barbershopId },
                    data: {
                        name: barbershopName,
                        document: document,
                        address: address,
                        phone: phone
                    }
                });
            }
        } else {
            // Cria a barbearia primeiro
            const newBarbershop = await prisma.barbershop.create({
                data: {
                    name: barbershopName,
                    document: document,
                    address: address,
                    phone: phone
                }
            });

            // Cria o usuário vinculando o ID da barbearia recém-criada
            await prisma.user.create({
                data: {
                    name: name,
                    email: email,
                    password: hashedPassword,
                    verificationCode: verificationCode,
                    verificationCodeExpires: expiresAt,
                    role: "ADMIN", // Quem cadastra a barbearia é ADMIN por padrão
                    barbershopId: newBarbershop.id
                }
            });
        }

        // Configuração do Nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Código de Verificação - Gestão de Barbearia',
            html: `
                <div style="font-family: sans-serif; background-color: #000; color: #fff; padding: 40px; text-align: center;">
                    <h2 style="color: #FFD700;">Bem-vindo à gestão da ${barbershopName}, ${name}!</h2>
                    <p style="color: #ccc; font-size: 16px;">Seu código de verificação é:</p>
                    <h1 style="background-color: #111; padding: 20px; letter-spacing: 5px; font-size: 32px; color: #FFD700; border: 1px solid #333; border-radius: 8px;">
                        ${verificationCode}
                    </h1>
                    <p style="color: #ccc; font-size: 14px; margin-top: 20px;">Este código expira em 15 minutos.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json(
            { message: 'Código enviado com sucesso!' },
            { status: 200 }
        );

    } catch (error) {
        console.error("Erro no send-code:", error);
        return NextResponse.json(
            { message: 'Erro interno no servidor.' },
            { status: 500 }
        );
    }
}