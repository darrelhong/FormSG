import { useMemo } from 'react'
import { Controller, useFormContext, useFormState } from 'react-hook-form'
import { FormControl, useMultiStyleConfig } from '@chakra-ui/react'
import { get } from 'lodash'

import { FormFieldWithId, RadioFieldBase } from '~shared/types/field'

import { RADIO_THEME_KEY } from '~theme/components/Radio'
import { createRadioValidationRules } from '~utils/fieldValidation'
import FormErrorMessage from '~components/FormControl/FormErrorMessage'
import Radio, { OthersInput } from '~components/Radio'

import { BaseFieldProps, FieldContainer } from '../FieldContainer'

export const RADIO_OTHERS_INPUT_KEY = 'others-input'
export const RADIO_OTHERS_INPUT_VALUE = '!!FORMSG_INTERNAL_RADIO_OTHERS_VALUE!!'

export type RadioFieldSchema = FormFieldWithId<RadioFieldBase>
export interface RadioFieldProps extends BaseFieldProps {
  schema: RadioFieldSchema
}

/**
 * @precondition Must have a parent `react-hook-form#FormProvider` component.
 */
export const RadioField = ({
  schema,
  questionNumber,
}: RadioFieldProps): JSX.Element => {
  const styles = useMultiStyleConfig(RADIO_THEME_KEY, {})

  const othersInputName = useMemo(
    () => `${schema._id}.${RADIO_OTHERS_INPUT_KEY}`,
    [schema._id],
  )
  const radioInputName = useMemo(() => `${schema._id}.value`, [schema._id])

  const validationRules = useMemo(
    () => createRadioValidationRules(schema),
    [schema],
  )

  const { register, getValues, trigger } = useFormContext()
  const { isValid, isSubmitting, errors } = useFormState({ name: schema._id })

  const othersValidationRules = useMemo(
    () => ({
      validate: (value: string) => {
        return (
          !schema.othersRadioButton ||
          !(getValues(radioInputName) === RADIO_OTHERS_INPUT_VALUE) ||
          !!value ||
          'Please specify a value for the "others" option'
        )
      },
    }),
    [getValues, radioInputName, schema.othersRadioButton],
  )

  return (
    <FieldContainer
      schema={schema}
      questionNumber={questionNumber}
      errorKey={radioInputName}
    >
      <Controller
        name={radioInputName}
        rules={validationRules}
        // `ref` omitted so the radiogroup will not have a ref and only the
        // radio themselves get the ref.
        render={({ field: { ref, onChange, value, ...rest } }) => (
          <Radio.RadioGroup
            {...rest}
            value={value}
            onChange={(nextValue) => {
              onChange(nextValue)
              // Trigger validation of others input if value is becoming or
              // not-becoming the special radio input value.
              if (
                nextValue === RADIO_OTHERS_INPUT_VALUE ||
                value === RADIO_OTHERS_INPUT_VALUE
              ) {
                trigger(othersInputName)
              }
            }}
          >
            {schema.fieldOptions.map((option, idx) => (
              <Radio key={idx} value={option} {...(idx === 0 ? { ref } : {})}>
                {option}
              </Radio>
            ))}
            {schema.othersRadioButton ? (
              <Radio.OthersWrapper value={RADIO_OTHERS_INPUT_VALUE}>
                <FormControl
                  isRequired={schema.required}
                  isDisabled={schema.disabled}
                  isReadOnly={isValid && isSubmitting}
                  isInvalid={!!get(errors, othersInputName)}
                >
                  <OthersInput
                    aria-label='Enter value for "Others" option'
                    {...register(othersInputName, othersValidationRules)}
                  />
                  <FormErrorMessage
                    ml={styles.othersInput?.ml as string}
                    mb={0}
                  >
                    {get(errors, `${othersInputName}.message`)}
                  </FormErrorMessage>
                </FormControl>
              </Radio.OthersWrapper>
            ) : null}
          </Radio.RadioGroup>
        )}
      />
    </FieldContainer>
  )
}