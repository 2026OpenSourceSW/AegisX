import { Loader2 } from 'lucide-react';
import { useLocation, useSearchParams } from 'react-router-dom';

import Logo from '@/components/icons/logo';
import LoginForm from '@/features/authentication/login-form';
import { getSafeReturnUrl } from '@/lib/utils/auth';
import { useUser } from '@/providers/user-provider';

function Login() {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const { authInfo, isLoading } = useUser();
    const authProviders = authInfo?.providers || [];

    const returnUrl = getSafeReturnUrl((location.state?.from as string) || searchParams.get('returnUrl'), '/dashboard');

    return (
        <div className="bg-background flex min-h-dvh w-full">
            <div className="grid min-h-dvh w-full lg:grid-cols-[minmax(0,1fr)_minmax(28rem,0.8fr)]">
                <div className="flex items-center justify-center px-4 py-10 md:px-8">
                    {!isLoading ? (
                        <LoginForm
                            providers={authProviders}
                            returnUrl={returnUrl}
                        />
                    ) : (
                        <Loader2 className="text-primary size-14 animate-spin" />
                    )}
                </div>
                <div className="hidden bg-[#1A2B4B] text-white lg:flex">
                    <section className="flex w-full flex-col justify-between p-10">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-lg">
                                    <Logo className="size-7" />
                                </div>
                                <div>
                                    <p className="text-2xl leading-8 font-bold">AegisX</p>
                                    <p className="text-sm font-semibold text-blue-300">Enterprise Security</p>
                                </div>
                            </div>
                        </div>
                        <div className="max-w-md">
                            <p className="text-3xl leading-10 font-bold">보안 점검 워크스페이스</p>
                            <p className="mt-4 text-base leading-7 text-slate-300">
                                간편 모드와 전문가 모드를 분리해 승인된 대상의 점검 흐름을 명확하게 관리합니다.
                            </p>
                        </div>
                        <p className="text-xs font-semibold text-slate-400">AegisX Secure Assistant</p>
                    </section>
                </div>
            </div>
        </div>
    );
}

export default Login;
