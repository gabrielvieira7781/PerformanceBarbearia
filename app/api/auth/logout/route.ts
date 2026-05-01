// app/api/auth/logout/route.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    try {
        const cookieStore = await cookies();
        
        // Deleta os cookies de forma segura pelo servidor
        cookieStore.delete('auth_token');
        cookieStore.delete('user_role');

        return NextResponse.json({ message: 'Logout realizado com sucesso' }, { status: 200 });
    } catch (error) {
        console.error("Erro ao realizar logout:", error);
        return NextResponse.json({ message: 'Erro ao sair' }, { status: 500 });
    }
}