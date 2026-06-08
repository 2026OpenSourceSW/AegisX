import { zodResolver } from '@hookform/resolvers/zod';
import debounce from 'lodash/debounce';
import { Camera, ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Form, FormControl, FormField } from '@/components/ui/form';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { useFlow } from '@/providers/flow-provider';

import FlowScreenshot from './flow-screenshot';

const searchFormSchema = z.object({
    search: z.string(),
});

function FlowScreenshots() {
    const { flowData, flowId } = useFlow();
    const previousFlowIdRef = useRef(flowId);

    const screenshots = useMemo(() => flowData?.screenshots ?? [], [flowData?.screenshots]);
    const [debouncedSearchValue, setDebouncedSearchValue] = useState('');

    const { containerRef, endRef, hasNewMessages, isScrolledToBottom, scrollToEnd } = useAutoScroll(
        screenshots,
        flowId,
    );

    const form = useForm<z.infer<typeof searchFormSchema>>({
        defaultValues: {
            search: '',
        },
        resolver: zodResolver(searchFormSchema),
    });

    const searchValue = useWatch({ control: form.control, name: 'search' });

    const debouncedUpdateSearch = useMemo(
        () =>
            debounce((value: string) => {
                setDebouncedSearchValue(value);
            }, 500),
        [],
    );

    useEffect(() => {
        debouncedUpdateSearch(searchValue);

        return () => {
            debouncedUpdateSearch.cancel();
        };
    }, [searchValue, debouncedUpdateSearch]);

    useEffect(() => {
        return () => {
            debouncedUpdateSearch.cancel();
        };
    }, [debouncedUpdateSearch]);

    useEffect(() => {
        if (!flowId || previousFlowIdRef.current === flowId) {
            return;
        }

        previousFlowIdRef.current = flowId;
        form.reset({ search: '' });
        queueMicrotask(() => setDebouncedSearchValue(''));
        debouncedUpdateSearch.cancel();
    }, [flowId, form, debouncedUpdateSearch]);

    const filteredScreenshots = useMemo(() => {
        const search = debouncedSearchValue.toLowerCase().trim();

        if (!search || !screenshots) {
            return screenshots || [];
        }

        return screenshots.filter((screenshot) => {
            return screenshot.url.toLowerCase().includes(search);
        });
    }, [screenshots, debouncedSearchValue]);

    const hasScreenshots = filteredScreenshots && filteredScreenshots.length > 0;

    return (
        <div className="flex h-full flex-col">
            <div className="bg-background sticky top-0 z-10 pb-4">
                <Form {...form}>
                    <div className="p-px">
                        <FormField
                            control={form.control}
                            name="search"
                            render={({ field }) => (
                                <FormControl>
                                    <InputGroup>
                                        <InputGroupAddon>
                                            <Search />
                                        </InputGroupAddon>
                                        <InputGroupInput
                                            {...field}
                                            autoComplete="off"
                                            placeholder="스크린샷 검색..."
                                            type="text"
                                        />
                                        {field.value && (
                                            <InputGroupAddon align="inline-end">
                                                <InputGroupButton
                                                    onClick={() => {
                                                        form.reset({ search: '' });
                                                        setDebouncedSearchValue('');
                                                        debouncedUpdateSearch.cancel();
                                                    }}
                                                    type="button"
                                                >
                                                    <X />
                                                </InputGroupButton>
                                            </InputGroupAddon>
                                        )}
                                    </InputGroup>
                                </FormControl>
                            )}
                        />
                    </div>
                </Form>
            </div>

            {hasScreenshots ? (
                <div className="relative flex-1 overflow-y-hidden">
                    <div
                        className="flex h-full flex-col gap-4 overflow-y-auto"
                        ref={containerRef}
                    >
                        {filteredScreenshots.map((screenshot) => (
                            <FlowScreenshot
                                key={screenshot.id}
                                screenshot={screenshot}
                            />
                        ))}
                        <div ref={endRef} />
                    </div>

                    {!isScrolledToBottom && (
                        <Button
                            className="absolute right-4 bottom-4 z-10 shadow-md hover:shadow-lg"
                            onClick={() => scrollToEnd()}
                            size="icon-sm"
                            type="button"
                            variant="outline"
                        >
                            <ChevronDown />
                            {hasNewMessages && (
                                <span className="bg-primary absolute -top-1.5 -right-1.5 size-3 rounded-full" />
                            )}
                        </Button>
                    )}
                </div>
            ) : (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Camera />
                        </EmptyMedia>
                        <EmptyTitle
                            aria-level={3}
                            role="heading"
                        >
                            스크린샷이 없습니다
                        </EmptyTitle>
                        <EmptyDescription>에이전트가 브라우저 스크린샷을 캡처하면 여기에 표시됩니다.</EmptyDescription>
                        <EmptyDescription>
                            어시스턴트 기반 점검은 스크린샷 없이 터미널/대화 로그만 남을 수 있습니다.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}
        </div>
    );
}

export default FlowScreenshots;
