import { Layout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  useListInterviewSessions, getListInterviewSessionsQueryKey,
  useListAptitudeSessions, getListAptitudeSessionsQueryKey,
  useListResumeSessions, getListResumeSessionsQueryKey
} from "@workspace/api-client-react";
import { Hammer, Brain, FileText, Calendar, Target, Award } from "lucide-react";
import { format } from "date-fns";

export default function History() {
  const { data: interviewSessions = [], isLoading: loadingInterviews } = useListInterviewSessions({
    query: { queryKey: getListInterviewSessionsQueryKey() }
  });
  
  const { data: aptitudeSessions = [], isLoading: loadingAptitude } = useListAptitudeSessions({
    query: { queryKey: getListAptitudeSessionsQueryKey() }
  });
  
  const { data: resumeSessions = [], isLoading: loadingResume } = useListResumeSessions({
    query: { queryKey: getListResumeSessionsQueryKey() }
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">History</h1>
          <p className="text-muted-foreground">Review your past preparation sessions and track your progress.</p>
        </div>

        <Tabs defaultValue="interview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
            <TabsTrigger value="interview">Interviews</TabsTrigger>
            <TabsTrigger value="aptitude">Aptitude</TabsTrigger>
            <TabsTrigger value="resume">Resumes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="interview" className="mt-6 space-y-4">
            {loadingInterviews ? (
              <div className="flex h-40 items-center justify-center">Loading...</div>
            ) : interviewSessions.length === 0 ? (
              <EmptyState icon={Hammer} title="No interviews yet" desc="Start your first mock interview to see it here." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {interviewSessions.map((session) => (
                  <Card key={session.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{session.role}</CardTitle>
                        <span className="font-bold text-primary bg-primary/10 px-2 py-1 rounded text-sm">{session.overallScore}/10</span>
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">{session.company}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-xs text-muted-foreground gap-1 pt-2 border-t mt-2">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(session.createdAt), "MMM d, yyyy")}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="aptitude" className="mt-6 space-y-4">
            {loadingAptitude ? (
              <div className="flex h-40 items-center justify-center">Loading...</div>
            ) : aptitudeSessions.length === 0 ? (
              <EmptyState icon={Brain} title="No aptitude tests" desc="Take a test to evaluate your skills." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {aptitudeSessions.map((session) => (
                  <Card key={session.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{session.category}</CardTitle>
                        <span className="font-bold text-primary bg-primary/10 px-2 py-1 rounded text-sm">{session.percentage}%</span>
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">{session.company}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t mt-2">
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3" /> {session.score}/{session.total}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(session.createdAt), "MMM d")}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="resume" className="mt-6 space-y-4">
            {loadingResume ? (
              <div className="flex h-40 items-center justify-center">Loading...</div>
            ) : resumeSessions.length === 0 ? (
              <EmptyState icon={FileText} title="No resumes analyzed" desc="Upload a resume to get feedback." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {resumeSessions.map((session) => (
                  <Card key={session.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg truncate" title={session.role}>{session.role}</CardTitle>
                        <span className="font-bold text-primary bg-primary/10 px-2 py-1 rounded text-sm">{session.score}</span>
                      </div>
                      <p className="text-sm text-muted-foreground font-medium truncate">{session.company}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t mt-2">
                        <div className="flex items-center gap-1">
                          <Award className="h-3 w-3" /> ATS: {session.atsCompatibility}%
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(session.createdAt), "MMM d")}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function EmptyState({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-xl border-muted-foreground/20 bg-muted/10">
      <div className="bg-primary/10 p-4 rounded-full mb-4 text-primary">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}
