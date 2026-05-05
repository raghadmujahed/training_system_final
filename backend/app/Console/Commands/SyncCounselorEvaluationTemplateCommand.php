<?php

namespace App\Console\Commands;

use App\Models\FieldEvaluationTemplate;
use Illuminate\Console\Command;

class SyncCounselorEvaluationTemplateCommand extends Command
{
    protected $signature = 'counselor:sync-evaluation-template';

    protected $description = 'تحديث قالب counselor_evaluation إلى نموذج 9 (٢٠ مؤشرًا)';

    public function handle(): int
    {
        FieldEvaluationTemplate::syncOfficialCounselorEvaluationTemplate();
        $tpl = FieldEvaluationTemplate::query()->where('code', 'counselor_evaluation')->first();
        $count = is_array($tpl?->criteria) ? count($tpl->criteria) : 0;
        $this->info("تم المزامنة. عدد البنود في القالب: {$count}");

        return self::SUCCESS;
    }
}
