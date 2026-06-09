import { Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormControl, FormItem, FormLabel } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';

interface AssistantAgentsControlProps {
    readonly checked: boolean;
    readonly disabled: boolean;
    readonly onCheckedChange: (checked: boolean) => void;
}

const assistantAgentsHelpItems = [
    '자동 점검은 작업과 세부 작업을 생성해 보고서 중심으로 실행합니다.',
    '어시스턴트 모드는 대화형 흐름으로 요청을 이어갑니다.',
    'Agents 사용을 켜면 pentester, searcher, coder, memorist, installer, adviser 같은 전문 에이전트에 복잡한 작업을 나눠 맡길 수 있습니다.',
    '더 넓은 다단계 작업을 처리할 수 있지만, 더 느리고 토큰을 더 사용할 수 있습니다.',
    '끄면 터미널, 파일, 브라우저, 검색 같은 직접 도구 위주로 처리합니다.',
] as const;

export function AssistantAgentsControl({ checked, disabled, onCheckedChange }: AssistantAgentsControlProps) {
    return (
        <FormItem className="flex flex-row items-center gap-1.5">
            <FormControl>
                <Switch
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={onCheckedChange}
                />
            </FormControl>
            <FormLabel className="cursor-pointer pl-1 text-xs font-normal">Agents 사용</FormLabel>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        aria-label="Agents 사용 도움말"
                        className="text-muted-foreground hover:text-foreground h-6 w-6 rounded-full"
                        size="icon-xs"
                        variant="ghost"
                    >
                        <Info className="size-3.5" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    className="w-[min(22rem,calc(100vw-2rem))] p-4"
                    side="top"
                >
                    <div className="space-y-3 text-sm leading-6">
                        <p className="text-foreground font-semibold">Agents 사용이란?</p>
                        <ul className="text-muted-foreground list-disc space-y-2 pl-5">
                            {assistantAgentsHelpItems.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </div>
                </PopoverContent>
            </Popover>
        </FormItem>
    );
}
