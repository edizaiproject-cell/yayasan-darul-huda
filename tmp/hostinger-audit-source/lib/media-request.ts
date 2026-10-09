export async function readMediaResponse(response:Response){
 if(response.status===413)throw new Error('Unggahan ditolak oleh batas ukuran server. Batas gambar adalah 10 MB.');
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw new Error(data?.error||(response.status===401?'Sesi berakhir. Masuk kembali sebelum mengunggah.':'Server gagal memproses unggahan. Silakan coba kembali.'));
 if(!data?.url)throw new Error('Respons unggahan tidak lengkap. Silakan coba kembali.');
 return data;
}
export async function uploadMediaRequest(form:FormData){
 let response:Response;
 try{response=await fetch('/api/media',{method:'POST',body:form});}
 catch{throw new Error('Koneksi ke server terputus saat mengunggah. Pastikan server website aktif, lalu coba lagi.');}
 return readMediaResponse(response);
}
