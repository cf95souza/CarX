/**
 * Utilitário de redimensionamento e compactação client-side de imagens (WebP/Canvas)
 * Reduz fotos de alta resolução de smartphones (5MB-15MB) para ~150KB-350KB
 * sem perda perceptível de nitidez para inspeções veiculares.
 */
export async function compressImageClientSide(
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.8
): Promise<File> {
  // Se não for um arquivo de imagem suportado, retorna o original
  if (!file || !file.type || !file.type.startsWith('image/')) {
    return file;
  }

  // Se já for um arquivo leve (menor que 150KB), não precisa reprocessar
  if (file.size < 150 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // Mantém a proporção limitando ao maxWidth / maxHeight
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Suavização bilinear para manter nitidez dos detalhes do veículo
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Gera WebP com fallback seguro para JPEG
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            const cleanName = file.name.replace(/\.[^/.]+$/, '');
            const compressedFile = new File([blob], `${cleanName}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            });

            // Se o arquivo comprimido ficou menor, utiliza ele; caso contrário mantém o original
            resolve(compressedFile.size < file.size ? compressedFile : file);
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
