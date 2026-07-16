import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import { Layout } from "@/components/layout";
import { Lock } from "lucide-react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Interview from "@/pages/interview";
import Aptitude from "@/pages/aptitude";
import Resume from "@/pages/resume";
import History from "@/pages/history";
import LinkedIn from "@/pages/linkedin";
import CoverLetter from "@/pages/cover-letter";
import Leetcode from "@/pages/leetcode";
import QuestionBank from "@/pages/question-bank";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, ...rest }: any) {
  return (
    <Route
      {...rest}
      component={(props: any) => {
        const { isAuthenticated, isLoading, login } = useAuth();
        
        if (isLoading) {
          return (
            <Layout>
              <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            </Layout>
          );
        }
        
        if (!isAuthenticated) {
          return (
            <Layout>
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ background: "rgba(99, 102, 241, 0.1)" }}>
                  <Lock className="w-8 h-8 text-indigo-500" />
                </div>
                <h1 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Sign in required</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
                  You need to be signed in to access this feature. Create an account or log in to continue preparing for your interviews.
                </p>
                <button
                  onClick={login}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-8 rounded-xl font-medium transition-colors"
                >
                  Sign In / Create Account
                </button>
              </div>
            </Layout>
          );
        }

        return <Component {...props} />;
      }}
    />
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <ProtectedRoute path="/interview" component={Interview} />
      <ProtectedRoute path="/aptitude" component={Aptitude} />
      <ProtectedRoute path="/resume" component={Resume} />
      <ProtectedRoute path="/history" component={History} />
      <ProtectedRoute path="/linkedin" component={LinkedIn} />
      <ProtectedRoute path="/cover-letter" component={CoverLetter} />
      <ProtectedRoute path="/leetcode" component={Leetcode} />
      <ProtectedRoute path="/question-bank" component={QuestionBank} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
