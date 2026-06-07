import { Info, ListChecks, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FlowForm, type FlowFormValues } from '@/features/flows/flow-form';
import { ScenarioCard, type ScenarioOption, scenarioOptions } from '@/features/flows/simple-mode-scenarios';
import { cn } from '@/lib/utils';

interface SimpleModeWorkspaceProps {
    readonly defaultValues: Partial<FlowFormValues>;
    readonly isLoading: boolean;
    readonly isOwnershipConfirmed: boolean;
    readonly isSimpleReady: boolean;
    readonly onOwnershipChange: (checked: boolean) => void;
    readonly onScenarioChange: (scenarioId: string) => void;
    readonly onSubmit: (values: FlowFormValues) => Promise<void>;
    readonly onTargetChange: (target: string) => void;
    readonly selectedScenario: ScenarioOption;
    readonly selectedScenarioId: string;
    readonly target: string;
}

export function SimpleModeWorkspace({
    defaultValues,
    isLoading,
    isOwnershipConfirmed,
    isSimpleReady,
    onOwnershipChange,
    onScenarioChange,
    onSubmit,
    onTargetChange,
    selectedScenario,
    selectedScenarioId,
    target,
}: SimpleModeWorkspaceProps) {
    const [isAuthorizationDialogOpen, setIsAuthorizationDialogOpen] = useState(false);

    const handleOwnershipCheckedChange = (checked: boolean) => {
        if (checked) {
            setIsAuthorizationDialogOpen(true);

            return;
        }

        onOwnershipChange(false);
    };

    const handleAuthorizationAccept = () => {
        onOwnershipChange(true);
        setIsAuthorizationDialogOpen(false);
    };

    return (
        <main className="bg-background min-h-[calc(100dvh-4rem)] px-4 py-8 md:px-8">
            <div className="mx-auto grid w-full max-w-6xl gap-8">
                <section className="max-w-3xl">
                    <h1 className="text-foreground text-3xl leading-10 font-bold">보안 점검 시작</h1>
                    <p className="text-muted-foreground mt-3 text-base leading-7">
                        비교적 빠르고 간편하게 보안 상태를 확인할 수 있습니다.
                    </p>
                </section>

                <Card className="overflow-hidden rounded-xl p-6 shadow-[0px_4px_12px_rgba(26,43,75,0.05)] md:p-8">
                    <div className="grid gap-5">
                        <label
                            className="grid gap-2"
                            htmlFor="simple-target"
                        >
                            <span className="text-foreground text-sm font-bold">점검 대상 (도메인 또는 IP)</span>
                            <Input
                                className="bg-background h-12 rounded-lg pl-4 text-base"
                                id="simple-target"
                                onChange={(event) => onTargetChange(event.target.value)}
                                placeholder="example.com 또는 192.168.0.10"
                                value={target}
                            />
                        </label>

                        <div className="text-foreground flex items-start gap-3 text-sm leading-6">
                            <Checkbox
                                checked={isOwnershipConfirmed}
                                className="mt-1"
                                id="simple-ownership-check"
                                onCheckedChange={(checked) => handleOwnershipCheckedChange(checked === true)}
                            />
                            <label
                                className="cursor-pointer select-none"
                                htmlFor="simple-ownership-check"
                            >
                                본인이 소유하거나 점검 권한이 있는 대상입니다.
                            </label>
                        </div>

                        <div className="bg-muted/60 text-muted-foreground flex items-start gap-3 rounded-lg border p-4 text-sm leading-6">
                            <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                            <span>등록된 대상 외부로는 점검을 수행하지 않습니다.</span>
                        </div>
                    </div>
                </Card>

                <section className="grid gap-4">
                    <h2 className="text-foreground text-2xl leading-8 font-bold">점검 시나리오 선택</h2>
                    <div className="grid gap-4 lg:grid-cols-2">
                        {scenarioOptions.map((scenario) => (
                            <ScenarioCard
                                isSelected={scenario.id === selectedScenarioId}
                                key={scenario.id}
                                onSelect={() => onScenarioChange(scenario.id)}
                                scenario={scenario}
                            />
                        ))}
                    </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
                    <Card className="rounded-xl p-6 shadow-[0px_4px_12px_rgba(26,43,75,0.05)]">
                        <div className="mb-5 flex items-center gap-3">
                            <ListChecks className="text-primary size-5" />
                            <h2 className="text-xl font-bold">실행 전 확인</h2>
                        </div>
                        <FlowForm
                            defaultValues={defaultValues}
                            isDisabled={!isSimpleReady}
                            isSubmitting={isLoading}
                            onSubmit={onSubmit}
                            placeholder={
                                isSimpleReady
                                    ? '필요하면 점검 요청을 수정하세요...'
                                    : '대상 입력과 권한 확인을 완료하면 실행 요청이 준비됩니다.'
                            }
                            submitLabel="점검 실행"
                            type="automation"
                        />
                    </Card>

                    <SimpleReviewPanel
                        isReady={isSimpleReady}
                        selectedScenario={selectedScenario}
                        target={target}
                    />
                </section>
            </div>

            <Dialog
                onOpenChange={setIsAuthorizationDialogOpen}
                open={isAuthorizationDialogOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>점검 권한 확인</DialogTitle>
                        <DialogDescription className="leading-6">
                            본인은 해당 대상의 소유자이거나 정당한 점검 권한을 보유하고 있음을 확인합니다.
                            <br />
                            무단 보안 점검은 관련 법령 위반에 해당할 수 있으며, 모든 책임은 사용자 본인에게 있습니다.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            onClick={() => setIsAuthorizationDialogOpen(false)}
                            type="button"
                            variant="outline"
                        >
                            취소
                        </Button>
                        <Button
                            onClick={handleAuthorizationAccept}
                            type="button"
                        >
                            동의하고 계속하기
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
}

function SimpleReviewPanel({
    isReady,
    selectedScenario,
    target,
}: {
    readonly isReady: boolean;
    readonly selectedScenario: ScenarioOption;
    readonly target: string;
}) {
    return (
        <Card className="rounded-xl p-6 shadow-[0px_4px_12px_rgba(26,43,75,0.05)]">
            <div className="mb-5 flex items-center gap-3">
                <ShieldCheck className="text-primary size-5" />
                <h2 className="text-xl font-bold">점검 요약 정보</h2>
            </div>
            <dl className="grid gap-5 text-sm">
                <div>
                    <dt className="text-muted-foreground font-semibold">대상</dt>
                    <dd className="text-foreground mt-1 text-base font-bold break-words">
                        {target.trim() || '대상을 입력하세요'}
                    </dd>
                </div>
                <div>
                    <dt className="text-muted-foreground font-semibold">시나리오</dt>
                    <dd className="text-foreground mt-1 text-base font-bold">{selectedScenario.title}</dd>
                </div>
                <div>
                    <dt className="text-muted-foreground font-semibold">예상 시간</dt>
                    <dd className="text-foreground mt-1 text-base font-bold">{selectedScenario.duration}</dd>
                </div>
                <div>
                    <dt className="text-muted-foreground font-semibold">위험도</dt>
                    <dd className="mt-1">
                        <Badge variant={selectedScenario.risk === 'Low' ? 'secondary' : 'outline'}>
                            {selectedScenario.risk === 'Low' ? '낮음' : '중간'}
                        </Badge>
                    </dd>
                </div>
            </dl>
            <div
                className={cn(
                    'mt-6 rounded-lg border p-4 text-sm leading-6',
                    isReady ? 'border-primary/30 bg-primary/10 text-primary' : 'bg-muted/60 text-muted-foreground',
                )}
            >
                Simple Mode에서는 AegisX 기능을 안전한 점검 워크플로우로 감싸서 제공합니다. 상세 실행 로그는 Expert
                Mode에서 확인할 수 있습니다.
            </div>
        </Card>
    );
}
