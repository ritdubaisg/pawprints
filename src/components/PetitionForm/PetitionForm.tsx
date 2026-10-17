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
import { PETITION_DESCRIPTION_MIN_LENGTH } from "@/lib/constants";
import { plainTextLength } from "@/lib/petition-text";
import { cn } from "@/lib/utils";

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
    .regex(/^[^<>]*$/, "HTML not allowed in title"),
  description: z
    .string()
    .refine(
      (val) => val !== "<p><br></p>" && val.trim() !== "",
      "Description is required",
    )
    .refine(
      (val) => plainTextLength(val) >= PETITION_DESCRIPTION_MIN_LENGTH,
      `Description must be at least ${PETITION_DESCRIPTION_MIN_LENGTH} characters`,
    ),
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
              <FormDescription className="flex flex-wrap justify-between gap-x-4">
                <span>
                  Minimum {PETITION_DESCRIPTION_MIN_LENGTH} characters. Be clear
                  and specific about what you&apos;re asking for.
                </span>
                <DescriptionCounter html={field.value} />
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

function DescriptionCounter({ html }: { html: string }) {
  const length = plainTextLength(html ?? "");
  const met = length >= PETITION_DESCRIPTION_MIN_LENGTH;
  return (
    <span
      className={cn(
        "tabular-nums",
        met && "text-emerald-700 dark:text-emerald-400",
      )}
    >
      {length}/{PETITION_DESCRIPTION_MIN_LENGTH}
    </span>
  );
}
