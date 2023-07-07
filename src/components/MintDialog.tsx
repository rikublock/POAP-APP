import React from "react";
import axios from "axios";
import { useAtom } from "jotai";
import type { ReactNode } from "react";
import { useSnackbar } from "notistack";
import {
  useForm,
  SubmitHandler,
  Controller,
  DefaultValues,
} from "react-hook-form";
import {
  object,
  boolean,
  string,
  number,
  date,
  intersection,
  TypeOf,
} from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CloseIcon from "@mui/icons-material/Close";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import API from "apis";
import { useWeb3 } from "connectors/context";
import { activeDialogAtom } from "states/atoms";
import { DialogIdentifier } from "types";
import { useAuth } from "components/AuthContext";

const schemaCommon = object({
  title: string()
    .nonempty("Title is required")
    .max(256, "Title must be less than 256 characters")
    .trim(),
  description: string()
    .nonempty("Description is required")
    .max(10000, "Description must be less than 10000 characters"),
  location: string()
    .nonempty("Location is required")
    .max(256, "Location must be less than 256 characters"),
  url: string().nonempty("URL is required").url("URL is invalid").trim(),
  tokenCount: number()
    .int()
    .positive()
    .max(200, "Token count must be less than or equal to 200"),
  isPublic: boolean(),
});

// Note: We allow nullable for the DatePicker component to work.
//       The final value will always be a valid Date.
const schemaDates = object({
  dateStart: date()
    .min(new Date("1900-01-01"), "Date is too far back")
    .nullable()
    .transform((value, ctx) => {
      if (value == null)
        ctx.addIssue({
          code: "custom",
          message: "Start Date is required",
        });
      return value;
    }),
  dateEnd: date()
    .min(new Date("1900-01-01"), "Date is too far back")
    .nullable()
    .transform((value, ctx) => {
      if (value == null)
        ctx.addIssue({
          code: "custom",
          message: "End Date is required",
        });
      return value;
    }),
}).refine(
  (data) => {
    if (data.dateEnd && data.dateStart) {
      return data.dateEnd >= data.dateStart;
    }
    return false;
  },
  {
    path: ["dateEnd"],
    message: "End Date must be later than Start Date",
  }
);

const schema = intersection(schemaCommon, schemaDates);

type MintFormValues = TypeOf<typeof schema>;

const defaultValues: DefaultValues<MintFormValues> = {
  title: "",
  description: "",
  location: "",
  url: "",
  dateStart: null,
  dateEnd: null,
  tokenCount: undefined,
  isPublic: false,
};

type MintDialogProps = {
  children?: ReactNode;
};

function MintDialog(props: MintDialogProps) {
  const { account, networkId } = useWeb3();
  const { isAuthenticated, jwt } = useAuth();
  const [open, setOpen] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [activeDialog, setActiveDialog] = useAtom(activeDialogAtom);
  const { enqueueSnackbar } = useSnackbar();

  const {
    control,
    register,
    formState: { errors, isValid },
    reset,
    handleSubmit,
  } = useForm<MintFormValues>({
    mode: "all",
    defaultValues: defaultValues,
    resolver: zodResolver(schema),
  });

  React.useEffect(() => {
    setOpen(activeDialog.type === DialogIdentifier.DIALOG_MINT);
  }, [activeDialog]);

  const handleClose = (event: {}, reason?: string) => {
    if (reason === "backdropClick") {
      return;
    }
    setActiveDialog({});
  };

  const handleCancel = (event: React.MouseEvent<HTMLButtonElement>) => {
    reset();
    setActiveDialog({});
  };

  const onSubmit: SubmitHandler<MintFormValues> = async (values) => {
    setLoading(true);
    try {
      if (account && networkId && jwt) {
        const result = await API.event.create(jwt, {
          networkId: networkId,
          tokenCount: values.tokenCount,
          title: values.title,
          description: values.description,
          location: values.location,
          imageUrl: values.url,
          dateStart: values.dateStart!,
          dateEnd: values.dateEnd!,
          isManaged: !values.isPublic,
        });
        console.debug("MintResult", result);
        enqueueSnackbar(`Mint successful: Event #${result.eventId}`, {
          variant: "success",
        });
        reset();
      }
    } catch (err) {
      console.debug(err);
      if (axios.isAxiosError(err)) {
        enqueueSnackbar(`Mint failed: ${err.response?.data.error}`, {
          variant: "error",
        });
      } else {
        enqueueSnackbar(`Mint failed: ${(err as Error).message}`, {
          variant: "error",
        });
      }
    } finally {
      setLoading(false);
      setActiveDialog({});
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
    >
      <DialogTitle
        sx={{
          paddingBottom: 0,
        }}
        variant="h5"
      >
        Create new Event
      </DialogTitle>
      <IconButton
        sx={{
          position: "absolute",
          right: 8,
          top: 8,
          color: (theme) => theme.palette.grey[500],
        }}
        size="small"
        onClick={handleClose}
        disabled={loading}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
      <DialogContent>
        <Stack
          component="form"
          noValidate
          autoComplete="off"
          onSubmit={handleSubmit(onSubmit)}
          direction="column"
          spacing={2}
        >
          <TextField
            label="Title"
            type="string"
            disabled={loading}
            required
            error={!!errors["title"]}
            helperText={errors["title"]?.message}
            {...register("title")}
          />
          <TextField
            label="Description"
            type="string"
            disabled={loading}
            required
            multiline
            rows={4}
            error={!!errors["description"]}
            helperText={errors["description"]?.message}
            {...register("description")}
          />
          <TextField
            label="Location"
            type="string"
            disabled={loading}
            required
            multiline
            rows={2}
            error={!!errors["location"]}
            helperText={errors["location"]?.message}
            {...register("location")}
          />
          <TextField
            label="Image URL"
            type="url"
            disabled={loading}
            required
            error={!!errors["url"]}
            helperText={errors["url"]?.message}
            {...register("url")}
          />
          <Stack direction="row" spacing={2}>
            <Controller
              control={control}
              name="dateStart"
              rules={{ required: true }}
              render={({
                field: { ref, onBlur, name, ...field },
                fieldState,
              }) => (
                <DatePicker
                  {...field}
                  inputRef={ref}
                  label="Start Date"
                  disabled={loading}
                  slotProps={{
                    textField: {
                      name: name,
                      required: true,
                      onBlur: onBlur,
                      error: !!fieldState.error,
                      helperText: fieldState.error?.message,
                    },
                  }}
                />
              )}
            />
            <Controller
              control={control}
              name="dateEnd"
              render={({
                field: { ref, onBlur, name, ...field },
                fieldState,
              }) => (
                <DatePicker
                  {...field}
                  inputRef={ref}
                  label="End Date"
                  disabled={loading}
                  slotProps={{
                    textField: {
                      name: name,
                      required: true,
                      onBlur: onBlur,
                      error: !!fieldState.error,
                      helperText: fieldState.error?.message,
                    },
                  }}
                />
              )}
            />
          </Stack>
          <TextField
            label="Token Count"
            type="number"
            disabled={loading}
            required
            error={!!errors["tokenCount"]}
            helperText={errors["tokenCount"]?.message}
            {...register("tokenCount", { valueAsNumber: true })}
          />
          <Controller
            control={control}
            name="isPublic"
            render={({ field: { ref, value, ...field }, fieldState }) => (
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      {...field}
                      inputRef={ref}
                      checked={value}
                      color={!!fieldState.error ? "error" : "primary"}
                    />
                  }
                  label={
                    <Typography
                      color={
                        !!fieldState.error
                          ? "error"
                          : value && !loading
                          ? "inherit"
                          : "text.secondary"
                      }
                    >
                      Allow any platform user to join the event (public)
                    </Typography>
                  }
                  disabled={loading}
                />
              </FormGroup>
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          color="primary"
          onClick={handleSubmit(onSubmit)}
          startIcon={loading && <CircularProgress size={20} />}
          disabled={
            loading || !Boolean(account) || !isValid || !isAuthenticated
          }
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default MintDialog;
