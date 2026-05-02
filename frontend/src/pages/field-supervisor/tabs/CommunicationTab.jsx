import { useState } from "react";
import { useStudentMessages } from "../../../hooks/useFieldSupervisorApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MessageCircle,
  Send,
  User,
  AlertTriangle,
  Check,
  CheckCircle,
  Clock,
  FileText,
  Star,
} from "lucide-react";

/**
 * تبويب التواصل مع الطالب والمشرف الأكاديمي
 */
export default function CommunicationTab({ studentId }) {
  const { messages, loading, error, refresh, sendMessage, messageAcademicSupervisor } =
    useStudentMessages(studentId);

  const [newMessage, setNewMessage] = useState("");
  const [relatedTo, setRelatedTo] = useState("general");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [messageTo, setMessageTo] = useState("student"); // 'student' or 'supervisor'

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    setSuccess(false);

    try {
      if (messageTo === "student") {
        await sendMessage(newMessage, relatedTo);
      } else {
        await messageAcademicSupervisor(newMessage, relatedTo);
      }
      setNewMessage("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      // Error handled by hook
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <CommunicationSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const getRelatedIcon = (relatedTo) => {
    switch (relatedTo) {
      case "attendance":
        return <CheckCircle className="w-4 h-4" />;
      case "daily_report":
        return <FileText className="w-4 h-4" />;
      case "evaluation":
        return <Star className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getRelatedLabel = (relatedTo) => {
    switch (relatedTo) {
      case "attendance":
        return "حضور";
      case "daily_report":
        return "تقرير يومي";
      case "evaluation":
        return "تقييم";
      case "issue":
        return "مشكلة ميدانية";
      default:
        return "متابعة عامة";
    }
  };

  return (
    <div className="space-y-6">
      {/* نموذج إرسال الرسالة */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-500" />
            إرسال رسالة جديدة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <Check className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                تم إرسال الرسالة بنجاح
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSend} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="comm-message-to">المرسل إليه</Label>
                <Select id="comm-message-to" name="message_to" value={messageTo} onValueChange={setMessageTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المستلم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">الطالب</SelectItem>
                    <SelectItem value="supervisor">المشرف الأكاديمي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="comm-related-to">الموضوع</Label>
                <Select id="comm-related-to" name="related_to" value={relatedTo} onValueChange={setRelatedTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الموضوع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">متابعة عامة</SelectItem>
                    <SelectItem value="attendance">حضور</SelectItem>
                    <SelectItem value="daily_report">تقرير يومي</SelectItem>
                    <SelectItem value="evaluation">تقييم</SelectItem>
                    <SelectItem value="issue">مشكلة ميدانية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="comm-message">الرسالة</Label>
              <Textarea
                id="comm-message"
                name="message_content"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="اكتب رسالتك هنا..."
                className="mt-1 min-h-[100px]"
                required
              />
            </div>

            <Button type="submit" disabled={sending || !newMessage.trim()} className="gap-2">
              <Send className="w-4 h-4" />
              {sending ? "جاري الإرسال..." : "إرسال الرسالة"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* سجل الرسائل */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            سجل الرسائل
          </CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد رسائل مسجلة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.is_from_me ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`
                      max-w-[80%] rounded-lg p-4
                      ${
                        message.is_from_me
                          ? "bg-blue-50 border border-blue-200"
                          : "bg-gray-50 border border-gray-200"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center
                          ${message.is_from_me ? "bg-blue-100" : "bg-gray-200"}
                        `}
                      >
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {message.is_from_me ? "أنت" : message.sender_name}
                        </p>
                        <p className="text-xs text-gray-500">{message.created_at}</p>
                      </div>
                    </div>

                    {message.related_to && (
                      <div className="flex items-center gap-1 mb-2">
                        {getRelatedIcon(message.related_to)}
                        <Badge variant="outline" className="text-xs">
                          {getRelatedLabel(message.related_to)}
                        </Badge>
                      </div>
                    )}

                    <p className="text-gray-900">{message.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Skeleton Loading
// ═══════════════════════════════════════════════════════════════════════════
function CommunicationSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
