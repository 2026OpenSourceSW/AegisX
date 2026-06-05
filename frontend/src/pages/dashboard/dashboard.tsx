import type { ReactNode } from 'react';

import { ArrowRight, CheckCircle2, ExternalLink, ShieldCheck, TerminalSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

import AegisXPageTopbar from '@/components/layouts/aegisx-page-topbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ModeCard {
    readonly accent: 'primary' | 'secondary';
    readonly cta: string;
    readonly description: string;
    readonly href: string;
    readonly icon: ReactNode;
    readonly points: readonly string[];
    readonly subtitle: string;
    readonly title: string;
}

const modeCards: readonly ModeCard[] = [
    {
        accent: 'primary',
        cta: 'Simple Mode 시작',
        description: '복잡한 보안 용어와 실행 과정을 줄이고, 점검 결과를 이해하기 쉬운 보고서로 제공합니다.',
        href: '/flows/new?mode=simple',
        icon: <ShieldCheck className="size-6" />,
        points: ['점검 시나리오 기반 실행', '단계별 승인', '쉬운 취약점 설명', '조치 중심 보고서', 'PDF 보고서 생성'],
        subtitle: '보안 전문 인력이 없는 사용자를 위한 쉬운 점검 모드',
        title: 'Simple Mode',
    },
    {
        accent: 'secondary',
        cta: 'Expert Mode 열기',
        description: 'AegisX의 기존 기능과 상세 실행 로그, 고급 설정을 그대로 사용할 수 있습니다.',
        href: '/flows/new?mode=expert',
        icon: <TerminalSquare className="size-6" />,
        points: [
            '기존 AegisX 기능 유지',
            '상세 로그 확인',
            '고급 실행 옵션',
            '에이전트 실행 흐름 확인',
            'Raw 결과 분석',
        ],
        subtitle: '기존 AegisX 기능을 그대로 사용하는 전문가 모드',
        title: 'Expert Mode',
    },
];

function Dashboard() {
    return (
        <>
            <AegisXPageTopbar
                mode="simple"
                subtitle="보안 점검 워크스페이스"
            />
            <main className="bg-background min-h-[calc(100dvh-4rem)] overflow-hidden px-4 py-10 md:px-8 md:py-16">
                <section className="mx-auto flex w-full max-w-6xl flex-col gap-12">
                    <div className="mx-auto max-w-3xl text-center">
                        <h2 className="text-foreground text-3xl font-bold md:text-[30px] md:leading-[38px]">
                            사용 목적에 맞는 점검 모드를 선택하세요
                        </h2>
                        <p className="text-muted-foreground mt-4 text-base leading-7">
                            AegisX의 강력한 보안 점검 기능을 그대로 유지하면서, 사용자의 전문성에 따라 Simple Mode와
                            Expert Mode로 나누어 제공합니다.
                        </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        {modeCards.map((card) => (
                            <ModeSelectionCard
                                card={card}
                                key={card.title}
                            />
                        ))}
                    </div>
                </section>
            </main>
        </>
    );
}

function ModeSelectionCard({ card }: { readonly card: ModeCard }) {
    const isPrimary = card.accent === 'primary';

    return (
        <Card className="group border-border bg-card relative flex min-h-[38rem] min-w-0 flex-col overflow-hidden rounded-xl p-6 shadow-[0px_4px_12px_rgba(26,43,75,0.05)] transition-transform hover:-translate-y-0.5 md:p-8">
            <div
                aria-hidden="true"
                className={cn(
                    'absolute top-0 right-0 h-32 w-32 rounded-bl-full opacity-50 transition-transform group-hover:scale-110',
                    isPrimary ? 'bg-primary/10' : 'bg-muted',
                )}
            />
            <div className="relative z-10 flex flex-1 flex-col">
                <div
                    className={cn(
                        'mb-6 flex size-12 items-center justify-center rounded-lg',
                        isPrimary ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground',
                    )}
                >
                    {card.icon}
                </div>

                <h3 className="text-foreground text-2xl leading-8 font-semibold">{card.title}</h3>
                <p
                    className={cn(
                        'mt-2 text-sm leading-5 font-semibold',
                        isPrimary ? 'text-primary' : 'text-muted-foreground',
                    )}
                >
                    {card.subtitle}
                </p>
                <p className="text-muted-foreground mt-3 text-sm leading-6">{card.description}</p>

                <ul className="mt-8 grid gap-3">
                    {card.points.map((point) => (
                        <li
                            className="text-foreground flex min-w-0 items-start gap-3 text-sm leading-6"
                            key={point}
                        >
                            <CheckCircle2
                                className={cn(
                                    'mt-0.5 size-4 shrink-0',
                                    isPrimary ? 'text-primary' : 'text-muted-foreground',
                                )}
                            />
                            <span className="min-w-0">{point}</span>
                        </li>
                    ))}
                </ul>

                <Button
                    asChild
                    className={cn(
                        'mt-auto h-auto min-h-14 w-full px-4 py-4 text-center text-sm font-bold whitespace-normal',
                        !isPrimary && 'border-primary bg-card text-primary hover:bg-primary/5 border-2',
                    )}
                    variant={isPrimary ? 'default' : 'outline'}
                >
                    <Link to={card.href}>
                        <span className="min-w-0">{card.cta}</span>
                        {isPrimary ? <ArrowRight className="size-4" /> : <ExternalLink className="size-4" />}
                    </Link>
                </Button>
            </div>
        </Card>
    );
}

export default Dashboard;
