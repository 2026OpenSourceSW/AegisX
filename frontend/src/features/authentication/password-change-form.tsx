import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { Input } from '@/components/ui/input';
import { api, type ApiErrorResponse, type ApiHttpError } from '@/lib/axios';

const passwordChangeSchema = z
    .object({
        confirmPassword: z.string().min(1, { message: '새 비밀번호를 한 번 더 입력하세요' }),
        currentPassword: z.string().min(1, { message: '현재 비밀번호를 입력하세요' }),
        newPassword: z
            .string()
            .min(8, { message: '비밀번호는 8자 이상이어야 합니다' })
            .max(100, { message: '비밀번호는 100자를 넘을 수 없습니다' })
            .refine(
                (password) => {
                    if (password.length > 15) {
                        return true;
                    }

                    return (
                        password.length >= 8 &&
                        /[0-9]/.test(password) &&
                        /[a-z]/.test(password) &&
                        /[A-Z]/.test(password) &&
                        /[!@#$&*]/.test(password)
                    );
                },
                {
                    message:
                        '비밀번호는 16자 이상이거나, 8자 이상이면서 숫자, 소문자, 대문자, 특수문자(!@#$&*)를 포함해야 합니다',
                },
            ),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: '새 비밀번호가 서로 일치하지 않습니다',
        path: ['confirmPassword'],
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
        message: '새 비밀번호는 현재 비밀번호와 달라야 합니다',
        path: ['newPassword'],
    });

interface PasswordChangeFormProps {
    isModal?: boolean;
    onCancel?: () => void;
    onSkip?: () => void;
    onSuccess?: () => void;
    showSkip?: boolean;
}

type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

export function PasswordChangeForm({
    isModal = true,
    onCancel,
    onSkip,
    onSuccess,
    showSkip = false,
}: PasswordChangeFormProps) {
    const [error, setError] = useState<null | string>(null);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const form = useForm<PasswordChangeFormValues>({
        defaultValues: {
            confirmPassword: '',
            currentPassword: '',
            newPassword: '',
        },
        resolver: zodResolver(passwordChangeSchema),
    });

    const handleSubmit = async (values: PasswordChangeFormValues) => {
        setError(null);

        try {
            await api.put('/user/password', {
                confirm_password: values.confirmPassword,
                current_password: values.currentPassword,
                password: values.newPassword,
            });

            form.reset();
            setShowCurrentPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);

            toast.success('비밀번호가 변경되었습니다');

            if (onSuccess) {
                onSuccess();
            }
        } catch (err: unknown) {
            const error = err as ApiHttpError;
            const responseData = error.response?.data as ApiErrorResponse | undefined;

            let errorMessage = '비밀번호 변경에 실패했습니다';

            if (responseData?.msg) {
                errorMessage = responseData.msg;
            } else if (responseData?.code) {
                switch (responseData.code) {
                    case 'AuthRequired':
                        errorMessage = '인증이 필요합니다';
                        break;
                    case 'Users.ChangePasswordCurrentUser.InvalidCurrentPassword':
                        errorMessage = '현재 비밀번호가 올바르지 않습니다';
                        break;
                    case 'Users.ChangePasswordCurrentUser.InvalidNewPassword':
                        errorMessage = '새 비밀번호가 요구 조건을 충족하지 않습니다';
                        break;
                    case 'Users.ChangePasswordCurrentUser.InvalidPassword':
                        errorMessage = '비밀번호 유효성 검사에 실패했습니다';
                        break;
                    case 'Users.NotFound':
                        errorMessage = '사용자를 찾을 수 없습니다';
                        break;
                    default:
                        errorMessage = responseData.msg || error.message || '비밀번호 변경에 실패했습니다';
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            setError(errorMessage);
        }
    };

    return (
        <Form {...form}>
            <form
                className="flex flex-col gap-4"
                onSubmit={form.handleSubmit(handleSubmit)}
            >
                <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>현재 비밀번호</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Input
                                        {...field}
                                        placeholder="현재 비밀번호 입력"
                                        type={showCurrentPassword ? 'text' : 'password'}
                                    />
                                    <Button
                                        className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        size="sm"
                                        tabIndex={-1}
                                        type="button"
                                        variant="ghost"
                                    >
                                        {showCurrentPassword ? (
                                            <EyeOff className="text-muted-foreground size-4" />
                                        ) : (
                                            <Eye className="text-muted-foreground size-4" />
                                        )}
                                    </Button>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>새 비밀번호</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Input
                                        {...field}
                                        placeholder="새 비밀번호 입력"
                                        type={showNewPassword ? 'text' : 'password'}
                                    />
                                    <Button
                                        className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        size="sm"
                                        tabIndex={-1}
                                        type="button"
                                        variant="ghost"
                                    >
                                        {showNewPassword ? (
                                            <EyeOff className="text-muted-foreground size-4" />
                                        ) : (
                                            <Eye className="text-muted-foreground size-4" />
                                        )}
                                    </Button>
                                </div>
                            </FormControl>
                            <FormDescription className="text-xs">
                                16자 이상이거나, 8자 이상이면서 숫자, 소문자, 대문자, 특수문자(!@#$&*)를 포함해야
                                합니다.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>새 비밀번호 확인</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Input
                                        {...field}
                                        placeholder="새 비밀번호 다시 입력"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                    />
                                    <Button
                                        className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        size="sm"
                                        tabIndex={-1}
                                        type="button"
                                        variant="ghost"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="text-muted-foreground size-4" />
                                        ) : (
                                            <Eye className="text-muted-foreground size-4" />
                                        )}
                                    </Button>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {error && <div className="text-destructive text-sm">{error}</div>}

                <div className="flex justify-end gap-2 pt-2">
                    {showSkip && (
                        <Button
                            className="text-muted-foreground"
                            onClick={onSkip}
                            type="button"
                            variant="ghost"
                        >
                            나중에 변경
                        </Button>
                    )}
                    {isModal && (
                        <Button
                            onClick={onCancel}
                            type="button"
                            variant="outline"
                        >
                            취소
                        </Button>
                    )}
                    <FormSubmitButton>
                        <span>비밀번호 변경</span>
                    </FormSubmitButton>
                </div>
            </form>
        </Form>
    );
}
