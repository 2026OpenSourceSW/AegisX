import { Bell, CircleUserRound, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

export type AegisXMode = 'expert' | 'simple';

interface AegisXPageTopbarProps {
    mode?: AegisXMode;
    onModeChange?: (mode: AegisXMode) => void;
    subtitle?: string;
    title?: string;
}

const modeLinks: readonly { href: string; label: string; mode: AegisXMode }[] = [
    { href: '/flows/new?mode=simple', label: '간편 모드', mode: 'simple' },
    { href: '/flows/new?mode=expert', label: '전문가 모드', mode: 'expert' },
];

function AegisXPageTopbar({ mode, onModeChange, subtitle, title = 'AegisX 보안 어시스턴트' }: AegisXPageTopbarProps) {
    const { setTheme, theme } = useTheme();
    const isDark = theme === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';
    const themeLabel = isDark ? '라이트 모드로 전환' : '다크 모드로 전환';

    return (
        <header className="bg-card sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4 shadow-xs md:px-6">
            <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger className="-ml-1 shrink-0 md:hidden" />
                <div className="min-w-0">
                    <h1 className="dark:text-foreground truncate text-base font-bold text-[#1A2B4B] md:text-xl">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-muted-foreground hidden text-xs font-semibold md:block">{subtitle}</p>
                    )}
                </div>
            </div>

            <div className="flex min-w-0 shrink-0 items-center gap-2 md:gap-4">
                <nav
                    aria-label="점검 모드"
                    className="bg-muted hidden min-w-0 rounded-lg p-1 sm:flex"
                >
                    {modeLinks.map((item) => (
                        <ModeSwitchButton
                            isActive={mode === item.mode}
                            item={item}
                            key={item.mode}
                            onModeChange={onModeChange}
                        />
                    ))}
                </nav>
                <Button
                    aria-label={themeLabel}
                    className="text-muted-foreground shrink-0"
                    onClick={() => setTheme(nextTheme)}
                    size="icon-sm"
                    title={themeLabel}
                    variant="ghost"
                >
                    {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
                </Button>
                <Button
                    aria-label="알림"
                    className="text-muted-foreground shrink-0"
                    size="icon-sm"
                    variant="ghost"
                >
                    <Bell className="size-5" />
                </Button>
                <Button
                    aria-label="사용자 메뉴"
                    className="text-muted-foreground shrink-0"
                    size="icon-sm"
                    variant="ghost"
                >
                    <CircleUserRound className="size-6" />
                </Button>
            </div>
        </header>
    );
}

function ModeSwitchButton({
    isActive,
    item,
    onModeChange,
}: {
    readonly isActive: boolean;
    readonly item: (typeof modeLinks)[number];
    readonly onModeChange?: (mode: AegisXMode) => void;
}) {
    const className = cn(
        'h-8 min-w-0 px-3 text-sm font-semibold shadow-none',
        isActive ? 'bg-card text-primary hover:bg-card shadow-xs' : 'text-muted-foreground hover:bg-card/70',
    );

    if (onModeChange) {
        return (
            <Button
                aria-pressed={isActive}
                className={className}
                onClick={() => onModeChange(item.mode)}
                size="sm"
                variant="ghost"
            >
                {item.label}
            </Button>
        );
    }

    return (
        <Button
            asChild
            className={className}
            size="sm"
            variant="ghost"
        >
            <Link to={item.href}>{item.label}</Link>
        </Button>
    );
}

export default AegisXPageTopbar;
