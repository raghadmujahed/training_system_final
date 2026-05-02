import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { checkFeatureFlag } from "../../services/api";
import { useStudentTrack } from "../../hooks/useStudentTrack";
import TrainingRequest from "./TrainingRequest";

export default function StudentTrainingRequestEntry() {
  const { isPsychology } = useStudentTrack();
  const [isOpen, setIsOpen] = useState(null);

  // Psychology students cannot create training requests — redirect instantly
  if (isPsychology) {
    return <Navigate to="/student/training-request-status" replace />;
  }

  useEffect(() => {
    let mounted = true;
    checkFeatureFlag("training_requests.create")
      .then((res) => {
        if (!mounted) return;
        setIsOpen(Boolean(res?.is_open));
      })
      .catch(() => {
        if (!mounted) return;
        setIsOpen(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (isOpen === null) {
    return (
      <div className="section-card">
        <p>جاري التحقق من إعدادات الميزة...</p>
      </div>
    );
  }

  if (!isOpen) {
    return <Navigate to="/student/training-request-status" replace />;
  }

  return <TrainingRequest />;
}
