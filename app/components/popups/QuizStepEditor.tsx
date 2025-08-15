import { useState } from "react";
import { 
  Card, 
  FormLayout, 
  TextField, 
  Select, 
  Button, 
  Text 
} from "@shopify/polaris";
import type { PopupStep, StepType } from "../../types/popup";

interface QuizStepEditorProps {
  step: Partial<PopupStep>;
  stepNumber: number;
  onChange: (step: Partial<PopupStep>) => void;
  onDelete: () => void;
  canDelete: boolean;
}

const STEP_TYPE_OPTIONS = [
  { label: 'Question', value: 'QUESTION' },
  { label: 'Email Capture', value: 'EMAIL' },
  { label: 'Discount Reveal', value: 'DISCOUNT_REVEAL' },
  { label: 'Content', value: 'CONTENT' }
];

export function QuizStepEditor({ 
  step, 
  stepNumber, 
  onChange, 
  onDelete, 
  canDelete 
}: QuizStepEditorProps) {
  const [stepType, setStepType] = useState<StepType>(step.stepType || 'QUESTION');
  const [content, setContent] = useState(step.content || {});

  const updateContent = (field: string, value: string) => {
    const newContent = { ...content, [field]: value };
    setContent(newContent);
    onChange({
      ...step,
      stepType,
      content: newContent
    });
  };

  const addOption = () => {
    const options = (content as any).options || [];
    const newOptions = [...options, { 
      id: Date.now().toString(), 
      text: '', 
      value: `option${options.length + 1}` 
    }];
    updateContent('options', newOptions);
  };

  const updateOption = (index: number, text: string) => {
    const options = [...((content as any).options || [])];
    options[index] = { ...options[index], text };
    updateContent('options', options);
  };

  const removeOption = (index: number) => {
    const options = [...((content as any).options || [])];
    options.splice(index, 1);
    updateContent('options', options);
  };

  return (
    <Card>
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            Step {stepNumber}
          </Text>
          {canDelete && (
            <Button size="micro" tone="critical" onClick={onDelete}>
              Delete Step
            </Button>
          )}
        </div>

        <FormLayout>
          <Select
            label="Step Type"
            options={STEP_TYPE_OPTIONS}
            value={stepType}
            onChange={(value) => {
              setStepType(value as StepType);
              onChange({ ...step, stepType: value as StepType });
            }}
          />

          {stepType === 'QUESTION' && (
            <>
              <TextField
                label="Question"
                value={(content as any).question || ''}
                onChange={(value) => updateContent('question', value)}
                placeholder="What's your preference?"
                autoComplete="off"
              />

              <div>
                <Text variant="bodyMd" as="p">Answer Options</Text>
                {((content as any).options || []).map((option: any, index: number) => (
                  <div key={option.id} style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <TextField
                        value={option.text}
                        onChange={(value) => updateOption(index, value)}
                        placeholder={`Option ${index + 1}`}
                        autoComplete="off"
                      />
                    </div>
                    {((content as any).options || []).length > 2 && (
                      <Button 
                        size="micro" 
                        tone="critical" 
                        onClick={() => removeOption(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                
                <div style={{ marginTop: '12px' }}>
                  <Button size="micro" onClick={addOption}>
                    Add Option
                  </Button>
                </div>
              </div>
            </>
          )}

          {stepType === 'EMAIL' && (
            <>
              <TextField
                label="Headline"
                value={(content as any).headline || ''}
                onChange={(value) => updateContent('headline', value)}
                placeholder="Get your results!"
                autoComplete="off"
              />
              <TextField
                label="Description"
                value={(content as any).description || ''}
                onChange={(value) => updateContent('description', value)}
                placeholder="Enter your email to continue"
                multiline
                autoComplete="off"
              />
              <TextField
                label="Button Text"
                value={(content as any).buttonText || ''}
                onChange={(value) => updateContent('buttonText', value)}
                placeholder="Get Results"
                autoComplete="off"
              />
            </>
          )}

          {stepType === 'DISCOUNT_REVEAL' && (
            <>
              <TextField
                label="Headline"
                value={(content as any).headline || ''}
                onChange={(value) => updateContent('headline', value)}
                placeholder="Here's your discount!"
                autoComplete="off"
              />
              <TextField
                label="Discount Code"
                value={(content as any).codeDisplay || ''}
                onChange={(value) => updateContent('codeDisplay', value)}
                placeholder="SAVE10"
                autoComplete="off"
              />
              <TextField
                label="Validity Text"
                value={(content as any).validityText || ''}
                onChange={(value) => updateContent('validityText', value)}
                placeholder="Valid for 24 hours"
                autoComplete="off"
              />
            </>
          )}

          {stepType === 'CONTENT' && (
            <>
              <TextField
                label="Headline"
                value={(content as any).headline || ''}
                onChange={(value) => updateContent('headline', value)}
                placeholder="Welcome!"
                autoComplete="off"
              />
              <TextField
                label="Description"
                value={(content as any).description || ''}
                onChange={(value) => updateContent('description', value)}
                placeholder="Tell your story..."
                multiline
                autoComplete="off"
              />
            </>
          )}
        </FormLayout>
      </div>
    </Card>
  );
}