import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { adminSupabase, supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

export default function LoginPage() {
  const consumerAuth = useAuth();
  const adminAuth = useAdminAuth();
  const { isAdminLike, loading: roleLoading } = useUserRole({ scope: "admin" });

  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const signedOutRef = useRef(false);

  const [adminEmail, setAdminEmail] = useState("dbcdkwo629@naver.com");
  const [adminPassword, setAdminPassword] = useState("12341234");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  const fromPath = useMemo(
    () => location.state?.from?.pathname as string | undefined,
    [location.state]
  );
  const isAdminLoginMode = location.pathname === "/admin/login";
  const { user, loading } = isAdminLoginMode ? adminAuth : consumerAuth;
  const redirectTo = fromPath || (isAdminLoginMode ? "/admin" : "/community");

  useEffect(() => {
    if (!isAdminLoginMode) {
      signedOutRef.current = false;
      return;
    }

    if (!user || roleLoading || isAdminLike || signedOutRef.current) {
      return;
    }

    signedOutRef.current = true;
    void (async () => {
      await adminSupabase.auth.signOut();
      toast({
        title: "관리자 로그인 필요",
        description: "관리자 또는 점주 계정으로 로그인해 주세요.",
      });
    })();
  }, [isAdminLoginMode, user, roleLoading, isAdminLike, toast]);

  // URL 파라미터로 ?auto=true 가 있으면 자동 로그인 시도
  useEffect(() => {
    if (isAdminLoginMode && !user && !loading && !roleLoading) {
      const params = new URLSearchParams(location.search);
      if (params.get("auto") === "true" && !isSubmitting) {
        handleAdminSignIn();
      }
    }
  }, [isAdminLoginMode, location.search, user, loading, roleLoading]);

  if (loading || (isAdminLoginMode && user && roleLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue" />
      </div>
    );
  }

  if (user && (!isAdminLoginMode || isAdminLike)) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleAdminSignIn = async () => {
    if (!adminEmail || !adminPassword) {
      toast({
        title: "입력값 확인",
        description: "이메일과 비밀번호를 모두 입력해 주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setAdminNotice(null);
    try {
      const { error } = await adminSupabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });
      if (error) {
        throw error;
      }

      toast({
        title: "로그인 성공",
        description: "관리자 페이지로 이동합니다.",
      });
      navigate("/admin", { replace: true });
    } catch (error) {
      toast({
        title: "로그인 실패",
        description:
          error instanceof Error ? error.message : "관리자 로그인에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminSignUp = async () => {
    if (!adminEmail || !adminPassword) {
      toast({
        title: "입력값 확인",
        description: "이메일과 비밀번호를 모두 입력해 주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setAdminNotice(null);
    try {
      const { data, error } = await adminSupabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
      });
      if (error) {
        throw error;
      }

      setAdminNotice(
        "회원가입이 완료되었습니다. profiles.role을 admin 또는 merchant로 설정한 뒤 다시 로그인해 주세요."
      );

      if (data.session) {
        await adminSupabase.auth.signOut();
      }
    } catch (error) {
      toast({
        title: "회원가입 실패",
        description:
          error instanceof Error ? error.message : "관리자 회원가입에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKakaoLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: `${window.location.origin}${redirectTo}`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      toast({
        title: "카카오 로그인 실패",
        description:
          error instanceof Error ? error.message : "카카오 로그인 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${redirectTo}`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      toast({
        title: "구글 로그인 실패",
        description:
          error instanceof Error ? error.message : "구글 로그인 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  if (isAdminLoginMode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-[24px] shadow-sm border-border">
          <CardHeader className="text-center space-y-2 pb-6">
            <CardTitle className="text-fluid-3xl font-black tracking-tight">
              관리자 로그인
            </CardTitle>
            <CardDescription className="text-fluid-sm font-medium">
              관리자 계정(이메일/비밀번호)으로 로그인해 주세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="관리자 이메일"
              autoComplete="email"
            />
            <Input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="비밀번호"
              autoComplete="current-password"
            />

            {adminNotice && (
              <div className="text-xs rounded-xl bg-blue-50 text-blue-700 border border-blue-200 p-3">
                {adminNotice}
              </div>
            )}

            <Button
              onClick={handleAdminSignIn}
              disabled={isSubmitting}
              className="w-full h-12 bg-accent-blue hover:bg-accent-blue/90 text-white font-bold rounded-xl text-base"
            >
              관리자 로그인
            </Button>
            
            {/* 평가위원용 시연 버튼 추가 */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">또는</span>
              </div>
            </div>
            
            <Button
              variant="secondary"
              onClick={handleAdminSignIn}
              disabled={isSubmitting}
              className="w-full h-12 font-bold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
            >
              🚀 평가위원 시연용 자동 로그인
            </Button>

            <Button
              variant="outline"
              onClick={handleAdminSignUp}
              disabled={isSubmitting}
              className="w-full h-11 font-bold rounded-xl mt-2"
            >
              관리자 회원가입
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="w-full h-11 text-muted-foreground"
            >
              홈으로 이동
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm rounded-[24px] shadow-sm border-border">
        <CardHeader className="text-center space-y-2 pb-6">
          <CardTitle className="text-fluid-3xl font-black tracking-tight">
            로그인
          </CardTitle>
          <CardDescription className="text-fluid-sm font-medium">
            카카오 또는 구글 계정으로 빠르게 로그인하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleKakaoLogin}
            className="w-full h-14 min-h-[56px] text-fluid-base bg-[#FEE500] hover:bg-[#FEE500]/90 text-black font-bold rounded-xl space-x-2 shadow-none"
          >
            <span>카카오로 계속하기</span>
          </Button>

          <Button
            onClick={handleGoogleLogin}
            className="w-full h-14 min-h-[56px] text-fluid-base bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-bold rounded-xl space-x-2 shadow-none"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            <span>구글로 계속하기</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
