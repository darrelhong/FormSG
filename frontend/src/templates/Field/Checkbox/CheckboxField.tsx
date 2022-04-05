import { forwardRef, useMemo } from 'react'
import {
  get,
  useFormContext,
  UseFormRegisterReturn,
  useFormState,
} from 'react-hook-form'
import { FormControl, useMultiStyleConfig } from '@chakra-ui/react'

import { CheckboxFieldBase, FormFieldWithId } from '~shared/types/field'

import { CHECKBOX_THEME_KEY } from '~theme/components/Checkbox'
import { createCheckboxValidationRules } from '~utils/fieldValidation'
import Checkbox from '~components/Checkbox'
import { CheckboxProps } from '~components/Checkbox/Checkbox'
import FormErrorMessage from '~components/FormControl/FormErrorMessage'

import { BaseFieldProps, FieldContainer } from '../FieldContainer'

export const CHECKBOX_OTHERS_INPUT_KEY = 'others-input'
export const CHECKBOX_OTHERS_INPUT_VALUE =
  '!!FORMSG_INTERNAL_CHECKBOX_OTHERS_VALUE!!'

export type CheckboxFieldSchema = FormFieldWithId<CheckboxFieldBase>
export interface CheckboxFieldProps extends BaseFieldProps {
  schema: CheckboxFieldSchema
}

/**
 * @precondition Must have a parent `react-hook-form#FormProvider` component.
 */
export const CheckboxField = ({
  schema,
  questionNumber,
}: CheckboxFieldProps): JSX.Element => {
  const styles = useMultiStyleConfig(CHECKBOX_THEME_KEY, {})

  const othersInputName = useMemo(
    () => `${schema._id}.${CHECKBOX_OTHERS_INPUT_KEY}`,
    [schema._id],
  )
  const checkboxInputName = useMemo(() => `${schema._id}.value`, [schema._id])

  const validationRules = useMemo(
    () => createCheckboxValidationRules(schema),
    [schema],
  )

  const { register, getValues, trigger } = useFormContext()
  const { isValid, isSubmitting, errors } = useFormState({
    name: schema._id,
  })

  const othersValidationRules = useMemo(
    () => ({
      validate: (value: string) => {
        const currCheckedVals = getValues(checkboxInputName)
        return (
          !(
            Array.isArray(currCheckedVals) &&
            currCheckedVals.includes(CHECKBOX_OTHERS_INPUT_VALUE)
          ) ||
          !!value ||
          'Please specify a value for the "others" option'
        )
      },
    }),
    [checkboxInputName, getValues],
  )

  return (
    <FieldContainer
      schema={schema}
      questionNumber={questionNumber}
      errorKey={checkboxInputName}
    >
      {schema.fieldOptions.map((o, idx) => (
        <Checkbox
          key={idx}
          value={o}
          {...register(checkboxInputName, validationRules)}
        >
          {o}
        </Checkbox>
      ))}
      {schema.othersRadioButton ? (
        <Checkbox.OthersWrapper>
          <FormControl
            isRequired={schema.required}
            isDisabled={schema.disabled}
            isReadOnly={isValid && isSubmitting}
            isInvalid={!!get(errors, othersInputName)}
          >
            <OtherCheckboxField
              value={CHECKBOX_OTHERS_INPUT_VALUE}
              isInvalid={!!get(errors, checkboxInputName)}
              triggerOthersInputValidation={() => trigger(othersInputName)}
              {...register(checkboxInputName, validationRules)}
            />
            <Checkbox.OthersInput
              aria-label='Enter value for "Others" option'
              {...register(othersInputName, othersValidationRules)}
            />
            <FormErrorMessage ml={styles.othersInput?.ml as string} mb={0}>
              {get(errors, `${othersInputName}.message`)}
            </FormErrorMessage>
          </FormControl>
        </Checkbox.OthersWrapper>
      ) : null}
    </FieldContainer>
  )
}

interface OtherCheckboxFieldProps
  extends UseFormRegisterReturn,
    Omit<CheckboxProps, keyof UseFormRegisterReturn> {
  value: string
  triggerOthersInputValidation: () => void
}
const OtherCheckboxField = forwardRef<
  HTMLInputElement,
  OtherCheckboxFieldProps
>(({ onChange, triggerOthersInputValidation, ...rest }, ref) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event)
    triggerOthersInputValidation()
  }

  return <Checkbox.OthersCheckbox onChange={handleChange} {...rest} ref={ref} />
})