
/**
 * Validation Utils (Zod-lite)
 * 
 * Uma implementação leve de validação de esquemas inspirada no Zod.
 * Garante que os dados do formulário estejam corretos antes de enviar ao banco.
 */

export const Validators = {
    // Validador de Texto Obrigatório
    string: (min = 1, message = "Campo obrigatório") => (value) => {
        if (!value || typeof value !== 'string' || value.trim().length < min) {
            return message;
        }
        return null; // Sucesso
    },

    // Validador de Número
    number: (min = 0, message = "Valor inválido") => (value) => {
        const num = Number(value);
        if (isNaN(num) || num < min) {
            return message;
        }
        return null;
    },

    // Validador de Email
    email: (message = "Email inválido") => (value) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!re.test(String(value).toLowerCase())) {
            return message;
        }
        return null;
    },

    // Validador de CPF/CNPJ (Simples)
    document: (message = "CPF/CNPJ inválido") => (value) => {
        const clean = String(value).replace(/\D/g, '');
        if (clean.length !== 11 && clean.length !== 14) {
            return message;
        }
        return null;
    }
};

/**
 * Hook useForm (React Hook Form-lite)
 * Gerencia estado de formulário e erros.
 */
import { useState } from 'react';

export function useForm(initialValues, schema) {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setValues(prev => ({ ...prev, [name]: value }));
        
        // Limpar erro ao digitar
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validate = () => {
        const newErrors = {};
        let isValid = true;

        for (const field in schema) {
            const validator = schema[field];
            const error = validator(values[field]);
            if (error) {
                newErrors[field] = error;
                isValid = false;
            }
        }

        setErrors(newErrors);
        return isValid;
    };

    return {
        values,
        setValues,
        errors,
        handleChange,
        validate,
        isSubmitting,
        setIsSubmitting
    };
}
