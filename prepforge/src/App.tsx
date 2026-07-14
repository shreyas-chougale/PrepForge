import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/interview" component={Interview} />
      <Route path="/aptitude" component={Aptitude} />
      <Route path="/resume" component={Resume} />
      <Route path="/history" component={History} />
      <Route path="/linkedin" component={LinkedIn} />
      <Route path="/cover-letter" component={CoverLetter} />
      <Route path="/leetcode" component={Leetcode} />
      <Route path="/question-bank" component={QuestionBank} />
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
