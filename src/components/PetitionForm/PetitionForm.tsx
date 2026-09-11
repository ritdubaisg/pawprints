"use client";

import { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getVisibleTextLength } from "@/lib/text-validation";

export interface PetitionFormData {
  title: string;
  description: string;
  category: string;
  targetSignatures: number;
  expiresDate?: string;
}

interface PetitionFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  onSubmit: (data: PetitionFormData) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  children?: React.ReactNode;
}

const categories = [
  "Academic Affairs",
  "Student Services",
  "Campus Life (SG, Clubs, & Organizations)",
  "Facilities & Parking",
  "Technology",
  "Housing",
  "Dining Services / Cafeteria",
  "Commuter Transportation",
  "Health & Wellness",
  "Safety & Security",
  "Accessibility & Inclusion",
  "Sustainability",
  "Financial Services",
  "Library & Learning Resources",
  "Career Services",
  "Other",
];

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    ["link"],
    ["clean"],
  ],
};

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "indent",
  "link",
];

export const formSchema = z.object({
  title: z
    .string()
    .min(10, "Title must be at least 10 characters")
    .max(150, "Title must be less than 150 characters")
    .regex(/^[^<>]*$/, "HTML not allowed in title")
    .superRefine((value, ctx) => {
      const visibleLength = getVisibleTextLength(value);
      if (visibleLength === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Title cannot be empty",
        });
        return;
      }

      if (visibleLength < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Title must contain at least 10 non-whitespace characters",
        });
      }
    }),
  description: z
    .string()
    .superRefine((value, ctx) => {
      const visibleLength = getVisibleTextLength(value);
      if (visibleLength === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Description cannot be empty",
        });
        return;
      }

      if (visibleLength < 50) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Description must contain at least 50 non-whitespace characters",
        });
      }
    }),
  category: z.string().min(1, "Please select a category"),
  targetSignatures: z.number(),
  expiresDate: z.string().optional(),
});

export type FormValues = z.infer<typeof formSchema>;

export default function PetitionForm({
  form,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Create Petition",
  children,
}: PetitionFormProps) {
  const handleSubmit = (values: FormValues) => {
    // Validate expiration date if provided
    if (values.expiresDate) {
      const expiryDate = new Date(values.expiresDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate < today) {
        form.setError("expiresDate", {
          type: "manual",
          message: "Expiration date must be in the future",
        });
        return;
      }
    }

    // Convert empty string expiresDate to undefined
    const submissionData: PetitionFormData = {
      ...values,
      expiresDate: values.expiresDate || undefined,
    };
    onSubmit(submissionData);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-8 mx-auto"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold text-foreground">
                Petition Title <span className="text-destructive">*</span>
              </FormLabel>
              <FormDescription>
                Make sure your title is action-oriented and preferably a
                one-line statement that summarizes your petition.
              </FormDescription>
              <FormControl>
                <Input
                  placeholder="Enter a clear and concise title for your petition"
                  disabled={isSubmitting}
                  className="h-12 text-lg"
                  {...field}
                />
              </FormControl>
              <div className="flex justify-between items-center">
                <FormMessage />
                <span className="text-xs text-muted-foreground ml-auto">
                  {field.value?.length || 0}/150
                </span>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold text-foreground">
                Category <span className="text-destructive">*</span>
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Tags will help others understand what the petition is about.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold text-foreground">
                Description <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <div className="bg-background rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-[#F76902] focus-within:ring-offset-2 focus-within:ring-offset-background">
                  <ReactQuill
                    theme="snow"
                    value={field.value}
                    onChange={field.onChange}
                    modules={modules}
                    formats={formats}
                    placeholder="This is the explanation and reasoning behind your petition. Why should someone sign it? How will it improve the community?"
                    className="petition-editor min-h-[200px]"
                    readOnly={isSubmitting}
                  />
                </div>
              </FormControl>
              <FormDescription>
                Minimum 50 characters. Be clear and specific about what you're
                asking for.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* <FormField
          control={form.control}
          name="expiresDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold text-gray-700">
                Expiration Date <span className="text-gray-500 text-xs font-normal">(Optional)</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="date"
                  disabled={isSubmitting}
                  min={new Date().toISOString().split('T')[0]}
                  className="h-12"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Leave blank for no expiration, or set a deadline for signature collection
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        /> */}

        <div className="mt-16">
          <p>
            Use of this site falls under the{" "}
            <a
              href="https://www.rit.edu/policies/c082"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              RIT Code of Conduct for Computer and Network Use
            </a>
            .
          </p>
          <br />
          <p>
            When using this service, you agree to sign petitions from only one
            RIT Computer Account. Should you have access to more than one
            account, you will only sign from your primary student, faculty, or
            staff account.
          </p>
          <br />
          <p className="font-bold">
            Please exercise good judgment when using this service.
          </p>
        </div>

        {children ? (
          children
        ) : (
          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isSubmitting}
              className="h-12 px-6"
            >
              Clear Form
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  Processing
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
